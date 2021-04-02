import BitBucketClient from "./bitBucket/BitBucketClient";
import * as jsonfile from "jsonfile";
import * as fs from "fs";
import PullRequestData from "./bitBucket/types/PullRequestData";
import GitClient from "./git/GitClient";
import StyleChecker from "./checkstyle/StyleChecker";
import { ExecException } from "child_process";

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

  /*
  styleChecker
    .runChecks("./repo/swp2020d/client/src/main/java/de/uol/swp/client/Main.java")
    .then(checks => {
      let comment = "";
      for (let check of checks) {
        comment += check.toMarkdown() + "\n";
      }
      bbClient.commentPullRequest(comment, 3);
    })
   */

  let prData = await bbClient.fetchPullRequest(3);
  let diff = await gitClient.diff(prData.fromRef.displayId, prData.toRef.displayId);
  console.log("from: " + prData.fromRef.displayId);
  console.log("to: " + prData.toRef.displayId);
  console.log(diff);
  let fullDiff = gitClient.extendRepoPaths(diff);
  await gitClient.checkout(prData.fromRef.displayId);
  let checks = await styleChecker.runChecks(fullDiff);
  let checkMarkdowns = [];
  for (let check of checks) {
    checkMarkdowns.push(check.toMarkdown());
  }
  console.log(checkMarkdowns);

  //bbClient.startHeartbeat();

  bbClient.on("heartbeat", () => {
    console.log("BB Update");
  });

  bbClient.on("prCreate", (pullRequest: PullRequestData) => {
    console.log("BB PR created");
  });

  bbClient.on("prClose", (pullRequest: PullRequestData) => {
    console.log("BB PR closed");
  })
})();
