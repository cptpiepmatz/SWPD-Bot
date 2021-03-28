import simpleGit, { SimpleGit } from "simple-git";
import * as fs from "fs";

/*
 * A client to interact with the git repo
 */
class GitClient {
  private readonly git: SimpleGit;
  private readonly repoName: string;

  constructor(
    private readonly cloneUrl: string,
    private readonly user: string,
    private readonly name: string,
    private readonly email: string,
    private readonly token: string
  ) {
    const dir = "./repo";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    this.git = simpleGit(dir, {
      config: [
        `user.name=${this.name}`,
        `user.email=${this.email}`
      ]
    });

    let protocolEndIndex = cloneUrl.indexOf("://");
    const remote = cloneUrl.substr(0, protocolEndIndex + 3)
      + this.user + ":" + this.token + "@"
      + cloneUrl.substr(protocolEndIndex + 3);

    this.git.clone(remote);

    let repoNameIndex = cloneUrl.lastIndexOf("/");
    let fileExtensionIndex = cloneUrl.lastIndexOf(".git");
    this.repoName = cloneUrl.substring(repoNameIndex + 1, fileExtensionIndex);
  }
}

export default GitClient;
