import BitBucketClient from "./bitBucket/BitBucketClient";
import * as jsonfile from "jsonfile";
import * as fs from "fs";
import PullRequestData from "./bitBucket/types/data/PullRequestData";
import GitClient from "./git/GitClient";
import StyleChecker from "./checkstyle/StyleChecker";
import IntelliJFormatter from "./formatter/IntelliJFormatter";

const token = (fs.readFileSync("./.token", "utf-8") as unknown as string)
  .replace(/[\r\n\s]+/g, "");

const bitBucketConfig = jsonfile.readFileSync("./bitbucketconfig.json") as {
  host: string,
  user: string,
  project: string,
  repo: string,
  name: string,
  email: string,
  isUserRepo: boolean
};

const formatterConfig = jsonfile.readFileSync("./formatterconfig.json") as {
  ideaPath: string,
  formatterXML: string
}


(async function() {
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

  await formatter.format("C:/Users/derPi/Google Drive/Uni/Softwareprojekt/swp2020d/client/src/main/java/de/uol/swp/client/ClientApp.java");

  //bbClient.startHeartbeat();

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
