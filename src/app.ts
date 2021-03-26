import BitBucketClient from "./bitBucket/BitBucketClient";
import * as jsonfile from "jsonfile";
import * as fs from "fs";

const clientData = jsonfile.readFileSync("./bitbucketconfig.json") as {
  host: string,
  user: string,
  project: string,
  repo: string
};

const token = fs.readFileSync("./.token") as unknown as string;

const client = new BitBucketClient(
  clientData.host,
  clientData.user,
  token,
  clientData.project,
  clientData.repo);

client.fetchPullRequests()
  .then(json => {
    console.log(json);
  });
