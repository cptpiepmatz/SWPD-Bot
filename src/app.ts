import BitBucketClient from "./bitBucket/BitBucketClient";
import * as jsonfile from "jsonfile";
import * as fs from "fs";
import PullRequestData from "./bitBucket/types/PullRequestData";
import GitClient from "./git/GitClient";

(async function() {
  const clientData = jsonfile.readFileSync("./bitbucketconfig.json") as {
    host: string,
    user: string,
    project: string,
    repo: string,
    name: string,
    email: string
  };

  const token = (fs.readFileSync("./.token", "utf-8") as unknown as string)
    .replace(/[\r\n\s]+/g, "");

  const bbClient = new BitBucketClient(
    clientData.host,
    clientData.user,
    token,
    clientData.project,
    clientData.repo);

  const gitClient = new GitClient(
    BitBucketClient.extractCloneURL(await bbClient.fetchRepository()) as string,
    clientData.user,
    clientData.name,
    clientData.email,
    token
  );

  await gitClient.diff("master", "develop")
    .then(res => {
      return gitClient.diff2FullPath(res)
    })
    .then(console.log);

//client.startHeartbeat();

  bbClient.on("prCreate", (pullRequest: PullRequestData) => {
    console.log(pullRequest);
  });
})();
