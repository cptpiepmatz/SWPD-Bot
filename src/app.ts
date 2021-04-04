import BitBucketClient from "./bitBucket/BitBucketClient";
import * as jsonfile from "jsonfile";
import * as fs from "fs";
import PullRequestData from "./bitBucket/types/data/PullRequestData";
import GitClient from "./git/GitClient";
import StyleChecker from "./checkstyle/StyleChecker";
import IntelliJFormatter from "./formatter/IntelliJFormatter";
import AwaitLock from "await-lock";

const token = (fs.readFileSync("./.token", "utf-8") as unknown as string)
  .replace(/[\r\n\s]+/g, "");

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

const formatterConfig = jsonfile.readFileSync("./formatterconfig.json") as {
  ideaPath: string,
  formatterXML: string
};


(async function() {
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

  async function fetchDiffSources(pullRequestId: number): Promise<string[]> {
    let diffResponse = await bbClient.fetchDiff(pullRequestId);
    let sources: Array<string> = [];
    for (let diff of diffResponse.diffs) {
      sources.push(diff.source.toString);
    }
    return gitClient.extendRepoPaths(sources);
  }

  bbClient.startHeartbeat();

  bbClient.on("heartbeat", () => {
    console.log("BB Update");
  });

  bbClient.on("prCreate", async (pullRequest: PullRequestData) => {
    console.log("BB PR created");
    let extendedSources = await fetchDiffSources(pullRequest.id);
    await lock.acquireAsync();
    await gitClient.checkout(pullRequest.fromRef.displayId);
    await gitClient.pull();
    let checks = await styleChecker.runChecks(extendedSources);
    lock.release();
    let markdownArray: Array<string> = [];
    for (let check of checks) {
      markdownArray.push(check.toMarkdown());
    }
    if (markdownArray.length !== 0) {
      let markdownString = markdownArray.join("\n");
      await bbClient.commentPullRequest(markdownString, pullRequest.id);
    }
  });

  bbClient.on("prClose", (pullRequest: PullRequestData) => {
    console.log("BB PR closed");
  });

  bbClient.on("prUpdate", async (oldPR: PullRequestData, newPR: PullRequestData) => {
    console.log("BB PR updated");

    function getApprovalCount(pr: PullRequestData): number {
      let approvalCount = 0;
      for (let reviewer of pr.reviewers) {
        if (reviewer.approved) approvalCount++;
      }
      return approvalCount;
    }

    if (getApprovalCount(oldPR) < bitBucketConfig.approvalsUntilFormat) {
      if (getApprovalCount(newPR) >= bitBucketConfig.approvalsUntilFormat) {
        console.log("formatting now!");
        let extendedSources = await fetchDiffSources(oldPR.id);
        await lock.acquireAsync();
        await gitClient.checkout(oldPR.fromRef.displayId);
        await formatter.format(extendedSources);
        console.log("formatted successfully");

        await gitClient.commitAll("Auto-Reformat PR#" + oldPR.id,
          "This action was performed automatically by a bot.");
        await gitClient.push();
        lock.release();
      }
    }
  });
})();
