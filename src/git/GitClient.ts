import simpleGit, { SimpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";

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
    let repoNameIndex = cloneUrl.lastIndexOf("/");
    let fileExtensionIndex = cloneUrl.lastIndexOf(".git");
    this.repoName = cloneUrl.substring(repoNameIndex + 1, fileExtensionIndex);

    const repoDir = "./repo";
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir);
    }
    const baseDir = path.join(repoDir, this.repoName)
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir)
    }

    //require('debug').enable('simple-git');

    this.git = simpleGit(repoDir, {
      baseDir: baseDir,
      config: [
        `user.name=${this.name}`,
        `user.email=${this.email}`
      ]
    });

    let protocolEndIndex = cloneUrl.indexOf("://");
    const remote = cloneUrl.substr(0, protocolEndIndex + 3)
      + this.user + ":" + this.token + "@"
      + cloneUrl.substr(protocolEndIndex + 3);

    if (fs.readdirSync(baseDir).length === 0) {
      this.git.clone(remote);
    }
  }

  async updateRepo(branchName?: string): Promise<void> {
    if (branchName) {
      await this.git.checkout(branchName).pull();
      return;
    }
    await this.git.pull();
    return;
  }

  async diff(fromRef: string, toRef: string): Promise<string[]> {
    await this.git.fetch();
    let fileArray = (await this.git
      .raw("diff", "--name-only", `origin/${fromRef}..origin/${toRef}`))
      .split("\n");
    fileArray.pop();
    return fileArray;
  }
}

export default GitClient;
