import AwaitLock from "await-lock";
import Logger from "../logger/Logger";
import { exec } from "child_process";
import GoalConfig from "./types/GoalConfig";

/**
 * Runner class for maven.
 */
class MavenExecutor {
  // Lock to make sure two runners aren't working at the same time.
  private readonly lock: AwaitLock;
  private readonly logger: Logger;

  /**
   * Constructor.
   *
   * @param mvnCmd The command this should use to execute maven goals
   * @param repoName The name of the repo to work in
   */
  constructor(
    private readonly mvnCmd: string,
    private readonly repoName: string
  ) {
    this.lock = new AwaitLock();

    this.logger = new Logger(this);
    this.logger.silly("Constructor done");
  }

  /**
   * Executes a maven command. All commands will be executed as cleans.
   *
   * @param parameters The parameters of the maven command
   */
  private async execMavenCommand(parameters: string): Promise<void> {
    await this.lock.acquireAsync();
    this.logger.verbose("Executing maven command: " + parameters);
    return new Promise((resolve, reject) => {
      exec(
        this.mvnCmd + " clean " + parameters,
        {cwd: "./repo/" + this.repoName},
        (error, stdout, stderr) => {
          // The executor is done with this command, release the lock
          this.lock.release();

          if (error !== null) {
            if (stdout.trim().length > 0) this.logger.error(stdout);
            if (stderr.trim().length > 0) this.logger.error(stderr);
            reject(error);
          }

          if (stdout.trim().length > 0) this.logger.debug(stdout);
          if (stderr.trim().length > 0) this.logger.debug(stderr);
          resolve();
        });
    });
  }

  /**
   * Executes a single maven goal.
   *
   * @param goal A maven goal
   */
  async executeGoal(goal: GoalConfig) {
    this.logger.verbose("Executing maven goal: " + goal.goal);
    let parameters = goal.goal;
    if (goal.skipTests) {
      parameters += " -DskipTests";
      this.logger.debug(`Goal ${goal.goal} will ignore tests`);
    }
    await this.execMavenCommand(parameters);
  }

  /**
   * Executes multiple maven goals. If one fails it checks if it's required,
   * if not it goes one.
   *
   * @param goals An array of maven goals
   */
  async executeGoals(goals: GoalConfig[]) {
    this.logger.debug("Executing multiple maven goals now");
    for (let goal of goals) {
      try {
        await this.executeGoal(goal);
      }
      catch (e) {
        this.logger.debug(e);
        if (goal.required) throw e;
      }
    }
  }

}

export default MavenExecutor;
