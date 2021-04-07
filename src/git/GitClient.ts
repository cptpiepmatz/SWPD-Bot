import * as fs from "fs";
import { exec } from "child_process";
import AwaitLock from "await-lock";

// The directory the repository should be stored in.
const repoDir = "./repo";

/*
 * A client to interact with the git repo.
 */
class GitClient {
  private readonly repoName: string;
  private readonly workingDir: string;
  private readonly lock: AwaitLock;

  /**
   * Constructor.
   *
   * @param cloneUrl The basic clone url
   * @param user The user to access the repo
   * @param name The display name used to commit
   * @param email The email used to commit
   * @param token The token to access the repo
   */
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
      // Preparing the repository if it doesn't exist locally.
      (async function(this: GitClient) {
        await this.runGitCommand("clone " + remote, repoDir);
        await this.runGitCommand(`config --local user.name "${this.name}"`, this.workingDir);
        await this.runGitCommand(`config --local user.email "${this.email}"`, this.workingDir);
      }).call(this).catch(console.error);
    }
  }

  /**
   * Helper method to run a git command.
   * <p>Only one git command is able to run a the same times.
   *
   * @param command The command to execute
   * @param cwd The directory to work in
   * @returns The output of the command
   * @private
   */
  private async runGitCommand(command: string, cwd: string): Promise<string> {
    // This will make sure that only one git command is executed and fulfilled
    // at the same time.
    await this.lock.acquireAsync();

    return new Promise((resolve, reject) => {
      exec("git " + command, {cwd: cwd}, (error, stdout, stderr) => {
        // The command is done, release the lock.
        this.lock.release();

        // Exit code 0 returns a null for the error object.
        if (error !== null) reject(error);
        resolve(stdout);
      });
    });
  }

  /**
   * Wrapper method for the "fetch" command.
   */
  async fetch(): Promise<void> {
    await this.runGitCommand("fetch", this.workingDir);
  }

  /**
   * Wrapper method for the "pull" command.
   */
  async pull(): Promise<void> {
    await this.runGitCommand("pull", this.workingDir);
  }

  /**
   * Wrapper method for the "checkout" command.
   * @param branch
   */
  async checkout(branch: string): Promise<void> {
    await this.fetch();
    await this.runGitCommand(`checkout ${branch}`, this.workingDir);
    await this.pull();
  }

  /**
   * Wrapper method for the "commit" command.
   * <p>This one uses the flag "-a" to commit all changed files.
   *
   * @param summary The summary/title of the commit
   * @param description An optional further description of the commit
   */
  async commitAll(summary: string, description?: string): Promise<void> {
    let commitMessage = `-m "${summary.trim()}"`;
    if (description?.trim().length !== 0) {
      commitMessage += ` -m "${description?.trim()}"`;
    }
    await this.runGitCommand(`commit -a ${commitMessage}`, this.workingDir);
  }

  /**
   * Wrapper method for the "push" command.
   */
  async push(): Promise<void> {
    await this.runGitCommand("push", this.workingDir);
  }

  /**
   * Wrapper method for the "stash" command.
   */
  async stash(): Promise<void> {
    await this.runGitCommand("stash", this.workingDir);
  }

  /**
   * Method to extend the repo paths known to git into the paths in the working
   * directory.
   * <p><b>This method does not check if the paths aren't already extended. It will
   * just prepend the working directory to the given path(s).
   *
   * @param diffPaths The paths to extend from
   * @returns An array of the extended paths
   */
  extendRepoPaths(diffPaths: string[]): string[] {
    let fullPaths = [];
    for (let diffPath of diffPaths) {
      fullPaths.push(this.workingDir + "/" + diffPath);
    }
    return fullPaths;
  }
}

export default GitClient;
