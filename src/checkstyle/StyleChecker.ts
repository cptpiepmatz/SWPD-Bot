import * as fs from "fs";
import * as path from "path";
import { exec, ExecException } from "child_process";
import CheckstyleCheck from "./CheckstyleCheck";
import Logger from "../logger/Logger";

// The version of the jar stored in the "lib" directory.
const checkstyleVersion = "8.41.1";

/**
 * A runner class for the checkstyle jar.
 */
class StyleChecker {
  private readonly checkstyles: string[] = [];
  private readonly logger: Logger;

  /**
   * Constructor.
   * <p>This will read in the checkstyles stored in the "checkstyles" directory.
   */
  constructor() {
    const checkstylesPath = "./checkstyles";
    if (fs.existsSync(checkstylesPath)) {
      for (let checkstylePath of fs.readdirSync(checkstylesPath)) {
        this.checkstyles.push(path.join(checkstylesPath, checkstylePath));
      }
    }

    this.logger = new Logger(this);
    this.logger.debug("Found checkstyles: " + this.checkstyles.join(" "));
    this.logger.silly("Constructor done");
  }

  /**
   * This executes a check on java files with the checkstyle jar.
   *
   * @param files The path(s) of the file(s) to check for
   * @returns An array of all the checks the jar spit out
   */
  async runChecks(files: string[] | string): Promise<CheckstyleCheck[]> {
    if (!Array.isArray(files)) files = [files];

    this.logger.debug("Running Checks on: " + files.join(" "));

    let filesConcat = "";
    for (let file of files) {
      filesConcat += `"${path.join(__dirname, "../..", file)}" `;
    }

    let checker = this;
    let checks: CheckstyleCheck[] = [];
    for (let checkstyle of this.checkstyles) {
      // Iterate over all checkstyle XMLs
      let [error, checkString, errorOut] = await (function() {
        // This form is used to promisify the exec function.
        return new Promise<[ExecException | null, string, string]>(function(resolve, reject) {
          // Run the jar file with the locally installed java. It also makes
          // sure that the output is set to english. This allows the correct
          // parsing of the output.
          let command ='java -Duser.language=en -jar "'
            + path.join(__dirname, `../../lib/checkstyle-${checkstyleVersion}-all.jar`)
            + '" -c "'
            + path.join(__dirname, "../..", checkstyle)
            + '" '
            + filesConcat;
          checker.logger.debug("Calling command: " + command);
          exec(command,
            (error, stdout, stderr) => {

              if (stdout.length !== 0) checker.logger.debug(stdout);
              if (stderr.length !== 0) checker.logger.error(stderr);

              return resolve([error, stdout, stderr]);
            });
        });
      })();

      // This is used to make sure the checker worked, since running this and
      // finding failed tests the jar will exit with -1.
      // But the jar may fail also for some other reason.
      let checkAmount = 0;
      for (let checkLine of checkString.split("\n")) {
        // Iterate over all the output lines and try to parse them.
        this.logger.debug("Try to parse: " + checkLine);
        let check = CheckstyleCheck.fromString(checkLine);
        if (check === null) continue;
        this.logger.debug("Parsed check for: " + checkLine);
        checks.push(CheckstyleCheck.fromString(checkLine) as CheckstyleCheck);
        checkAmount++;
      }
      if (error !== null && checkAmount === 0) {
        // If the jar did exit without any parsable output and the error from
        // the exec is not null something must've happened here.
        throw error;
      }
    }
    return checks;
  }
}

export default StyleChecker;
