import BitBucketClient from "./bitBucket/BitBucketClient"

const client = new BitBucketClient(
  "https://git.swl.informatik.uni-oldenburg.de",
  "SWP2020D_Bot",
  "MzAwMDcwODk0NjQ2OpZePzraFN6E9Ws3NRExx6DIX9ML",
  "SP",
  "swp2020d");

client.fetchPullRequests()
  .then(json => {
    console.log(json);
  });
