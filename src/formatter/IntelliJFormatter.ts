import AwaitLock from "await-lock";
import { exec } from "child_process";
import { resolve } from "path";
import Logger from "../logger/Logger";
import * as fs from "fs/promises";

/**
 * Runner class for the IntelliJ format utility.
 * <p>Since this runs IntelliJ, it has to be installed on the machine in order
 * to allow this class to work.
 */
class IntelliJFormatter {
  // Lock to make sure two runners aren't working at the same time.
  private readonly lock: AwaitLock;
  private readonly logger: Logger;

  /**
   * Constructor.
   *
   * @param ideaPath The path of the executable
   */
  constructor(private readonly ideaPath: string) {
    this.lock = new AwaitLock();

    this.logger = new Logger(this);
    this.logger.silly("Constructor done");
  }

  /**
   * Formats all the files passed files.
   * If a file is missing, it will be skipped.
   *
   * @param files Path(s) of the file(s) to format
   */
  async format(files: string[] | string): Promise<void> {
    this.logger.verbose("Formatting " + files.length + " files");
    // Don't try anything if the array or the string is empty.
    if (files.length === 0) return;
    if (!Array.isArray(files)) files = [files];
    let fileString = "";
    for (let file of files) {
      try {
        // Check if a file exists, if not, skip it.
        await fs.access(file);
      }
      catch (e) {
        continue;
      }
      fileString += `"${resolve(file)}" `;
    }
    // If no file exists, the formatter doesn't have to do anything.
    if (fileString.length == 0) return;

    // Wait until the the formatter is done with it's other format actions.
    await this.lock.acquireAsync();
    return new Promise((resolve, reject) => {
      // Promisify the exec function.

      let command =
        `${this.ideaPath} format ${fileString}`;
      this.logger.debug("Calling Command: " + command);
      exec(
        command,
        {cwd: "."},
        (error, stdout, stderr) => {
          // The formatter is done, the lock can be released.
          this.lock.release();

          if (stdout.length !== 0) this.logger.debug(stdout);
          if (stderr.length !== 0) this.logger.error(stderr);

          if (error !== null) reject(error);
          // If the files are formatted correctly there is no need for further
          // output right now.
          resolve();
        });
    });
  }
}

export default IntelliJFormatter;
