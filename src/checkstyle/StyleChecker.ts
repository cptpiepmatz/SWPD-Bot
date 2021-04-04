import * as fs from "fs";
import * as path from "path";
import { exec, ExecException } from "child_process";
import CheckstyleCheck from "./CheckstyleCheck";

const checkstyleVersion = "8.41.1";

class StyleChecker {
  private readonly checkstyles: string[] = [];

  constructor() {
    const checkstylesPath = "./checkstyles";
    if (fs.existsSync(checkstylesPath)) {
      for (let checkstylePath of fs.readdirSync(checkstylesPath)) {
        this.checkstyles.push(path.join(checkstylesPath, checkstylePath));
      }
    }
  }

  async runChecks(files: string[] | string): Promise<CheckstyleCheck[]> {
    if (!Array.isArray(files)) files = [files];
    let filesConcat = "";
    for (let file of files) {
      filesConcat += `"${path.join(__dirname, "../..", file)}" `;
    }
    let checks: CheckstyleCheck[] = [];
    for (let checkstyle of this.checkstyles) {
      let [error, checkString, errorOut] = await (function() {
        return new Promise<[ExecException | null, string, string]>(function(resolve, reject) {
          exec('java -Duser.language=en -jar "'
            + path.join(__dirname, `../../lib/checkstyle-${checkstyleVersion}-all.jar`)
            + '" -c "'
            + path.join(__dirname, "../..", checkstyle)
            + '" '
            + filesConcat,
            (error, stdout, stderr) => {
              return resolve([error, stdout, stderr]);
            });
        });
      })();
      let checkAmount = 0;
      for (let checkLine of checkString.split("\n")) {
        let check = CheckstyleCheck.fromString(checkLine);
        if (check === null) continue;
        checks.push(CheckstyleCheck.fromString(checkLine) as CheckstyleCheck);
        checkAmount++;
      }
      if (error !== null && checkAmount === 0) {
        throw error;
      }
    }
    return checks;
  }
}

export default StyleChecker;
