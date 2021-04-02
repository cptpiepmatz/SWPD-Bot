import BitBucketClient from "./bitBucket/BitBucketClient";
import * as jsonfile from "jsonfile";
import * as fs from "fs";
import PullRequestData from "./bitBucket/types/data/PullRequestData";
import GitClient from "./git/GitClient";
import StyleChecker from "./checkstyle/StyleChecker";

(async function() {
  const clientData = jsonfile.readFileSync("./bitbucketconfig.json") as {
    host: string,
    user: string,
    project: string,
    repo: string,
    name: string,
    email: string,
    isUserRepo: boolean
  };

  const token = (fs.readFileSync("./.token", "utf-8") as unknown as string)
    .replace(/[\r\n\s]+/g, "");

  const bbClient = new BitBucketClient(
    clientData.host,
    clientData.user,
    token,
    clientData.project,
    clientData.repo,
    clientData.isUserRepo);

  const gitClient = new GitClient(
    BitBucketClient.extractCloneURL(await bbClient.fetchRepository()) as string,
    clientData.user,
    clientData.name,
    clientData.email,
    token
  );

  const styleChecker = new StyleChecker();

  bbClient.startHeartbeat();

  bbClient.on("heartbeat", () => {
    console.log("BB Update");
  });

  bbClient.on("prCreate", async (pullRequest: PullRequestData) => {
    let diffResponse = await bbClient.fetchDiff(pullRequest.id);
    let sources: Array<string> = [];
    for (let diff of diffResponse.diffs) {
      sources.push(diff.source.toString);
    }
    let extendedSources = gitClient.extendRepoPaths(sources);
    await gitClient.checkout(pullRequest.fromRef.displayId);
    await gitClient.pull();
    let checks = await styleChecker.runChecks(extendedSources);
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
  })
})();
