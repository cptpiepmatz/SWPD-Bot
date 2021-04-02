import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import AwaitLock from "await-lock";

const repoDir = "./repo";

/*
 * A client to interact with the git repo
 */
class GitClient {
  private readonly repoName: string;
  private readonly workingDir: string;
  private readonly lock: AwaitLock;

  constructor(
    private readonly cloneUrl: string,
    private readonly user: string,
    private readonly name: string,
    private readonly email: string,
    private readonly token: string
  ) {
    // getting the repo name
    let repoNameIndex = cloneUrl.lastIndexOf("/");
    let fileExtensionIndex = cloneUrl.lastIndexOf(".git");
    this.repoName = cloneUrl.substring(repoNameIndex + 1, fileExtensionIndex);

    // defining what the working directory will be
    this.workingDir = repoDir + "/" + this.repoName;

    // getting a remote url with login data
    let protocolEndIndex = cloneUrl.indexOf("://");
    const remote = cloneUrl.substr(0, protocolEndIndex + 3)
      + this.user + ":" + this.token + "@"
      + cloneUrl.substr(protocolEndIndex + 3);

    this.lock = new AwaitLock();
    if (!fs.existsSync(this.workingDir)) {
      (async function(this: GitClient) {
        await this.runGitCommand("clone " + remote, repoDir);
        await this.runGitCommand(`config --local user.name "${this.name}"`, this.workingDir);
        await this.runGitCommand(`config --local user.email "${this.email}"`, this.workingDir);
      }).call(this).catch(console.error);
    }
  }

  private async runGitCommand(command: string, cwd: string): Promise<string> {
    await this.lock.acquireAsync();
    return new Promise((resolve, reject) => {
      exec("git " + command, {cwd: cwd}, (error, stdout, stderr) => {
        this.lock.release();
        if (error !== null) reject(error);
        resolve(stdout);
      });
    });
  }

  private async fetch(): Promise<void> {
    await this.runGitCommand("fetch", this.workingDir);
  }

  private async pull(): Promise<void> {
    await this.runGitCommand("pull", this.workingDir);
  }

  async diff(fromRef: string, toRef: string): Promise<string[]> {
    let diffOut = await this.runGitCommand(
      `diff --name-only ${fromRef}..${toRef}`,
      this.workingDir);
    let diffArray =  diffOut.split("\n");
    diffArray.pop();
    return diffArray;
  }

  async checkout(branch: string): Promise<void> {
    await this.fetch();
    await this.runGitCommand(`checkout ${branch}`, this.workingDir);
    await this.pull();
  }

  extendRepoPaths(diffPaths: string[]): string[] {
    let fullPaths = [];
    for (let diffPath of diffPaths) {
      fullPaths.push(this.workingDir + "/" +diffPath);
    }
    return fullPaths;
  }
}

export default GitClient;
