import BitBucketClient from "./bitBucket/BitBucketClient";
import * as jsonfile from "jsonfile";
import * as fs from "fs";
import PullRequestData from "./bitBucket/types/data/PullRequestData";
import GitClient from "./git/GitClient";
import StyleChecker from "./checkstyle/StyleChecker";
import IntelliJFormatter from "./formatter/IntelliJFormatter";
import AwaitLock from "await-lock";

// The token used to log into BitBucket.
const token = (fs.readFileSync("./.token", "utf-8") as unknown as string)
  .replace(/[\r\n\s]+/g, "");

// The config used to configure the repo to interact with.
const bitBucketConfig = jsonfile.readFileSync("./bitbucketconfig.json") as {
  host: string,
  user: string,
  project: string,
  repo: string,
  name: string,
  email: string,
  isUserRepo: boolean,
  approvalsUntilFormat: number
};

// The config for the formatter to use.
const formatterConfig = jsonfile.readFileSync("./formatterconfig.json") as {
  ideaPath: string,
  formatterXML: string
};

// Anonymous async function to allow top-level await calls.
(async function() {
  // A lock to make sure only one operation modifying files is used at the same
  // time.
  const lock = new AwaitLock();

  const bbClient = new BitBucketClient(
    bitBucketConfig.host,
    bitBucketConfig.user,
    token,
    bitBucketConfig.project,
    bitBucketConfig.repo,
    bitBucketConfig.isUserRepo);

  const gitClient = new GitClient(
    BitBucketClient.extractCloneURL(await bbClient.fetchRepository()) as string,
    bitBucketConfig.user,
    bitBucketConfig.name,
    bitBucketConfig.email,
    token
  );

  const styleChecker = new StyleChecker();

  const formatter = new IntelliJFormatter(
    formatterConfig.ideaPath,
    formatterConfig.formatterXML
  );

  // Small helper function to fetch the diffs and get their full paths.
  async function fetchDiffSources(pullRequestId: number): Promise<string[]> {
    let diffResponse = await bbClient.fetchDiff(pullRequestId);
    let sources: Array<string> = [];
    for (let diff of diffResponse.diffs) {
      sources.push(diff.source.toString);
    }
    return gitClient.extendRepoPaths(sources);
  }

  // This will start the heartbeat of the BitBucket client to allow listening to
  // it's events.
  bbClient.startHeartbeat();

  bbClient.on("heartbeat", () => {
    console.log("BB Update");
  });

  bbClient.on("prCreate", async (pullRequest: PullRequestData) => {
    // When a pull request is opened the bot shall fetch the diffs and run a
    // style check over it. The output of the check shall be commented under the
    // pull request.

    console.log("BB PR created");

    let extendedSources = await fetchDiffSources(pullRequest.id);

    await lock.acquireAsync(); // Files should be frozen here.

    await gitClient.checkout(pullRequest.fromRef.displayId);
    await gitClient.pull();

    let checks = await styleChecker.runChecks(extendedSources);

    lock.release(); // Files can be modified again.

    // Prepare the markdown comment.
    let markdownArray: Array<string> = [];
    for (let check of checks) {
      markdownArray.push(check.toMarkdown());
    }
    if (markdownArray.length !== 0) {
      // If there is at least one thing to comment, it will be.
      let markdownString = markdownArray.join("\n");
      await bbClient.commentPullRequest(markdownString, pullRequest.id);
      return;
    }

    // Also post a comment if no conflicts were found.
    let okString = "**✔️ No checkstyle conflicts found.** "
    await bbClient.commentPullRequest(okString, pullRequest.id);
  });

  bbClient.on("prClose", (pullRequest: PullRequestData) => {
    console.log("BB PR closed");
  });

  bbClient.on("prUpdate", async (oldPR: PullRequestData, newPR: PullRequestData) => {
    // When the pull request updates the listener checks for the amount of
    // approvals. If the amount reaches the first time it's needed high the bot
    // will perform a format. If there any formatted files, they will be
    // committed and pushed.

    console.log("BB PR updated");

    // Helper function to count the approvals of a pull request.
    function getApprovalCount(pr: PullRequestData): number {
      let approvalCount = 0;
      for (let reviewer of pr.reviewers) {
        if (reviewer.approved) approvalCount++;
      }
      return approvalCount;
    }

    if (getApprovalCount(oldPR) < bitBucketConfig.approvalsUntilFormat) {
      // Check if the old PR had NOT enough approvals.
      if (getApprovalCount(newPR) >= bitBucketConfig.approvalsUntilFormat) {
        // Check if the new one has enough approvals.

        console.log("formatting now!");
        // Fetch differences and run the formatter.
        let extendedSources = await fetchDiffSources(oldPR.id);
        await lock.acquireAsync();
        await gitClient.checkout(oldPR.fromRef.displayId);
        await formatter.format(extendedSources);
        console.log("formatted successfully");

        // Commit everything and push it.
        await gitClient.commitAll("Auto-Reformat PR#" + oldPR.id,
          "This action was performed automatically by a bot.");
        await gitClient.push();
        lock.release();
      }
    }
  });
})();
