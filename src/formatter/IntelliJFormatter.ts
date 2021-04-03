import AwaitLock from "await-lock";
import { exec } from "child_process";
import { resolve } from "path";

const formatterDir = "./idea-formatter";

class IntelliJFormatter {
  private readonly lock: AwaitLock;
  private readonly formatterConfig: string;

  constructor(private readonly ideaPath: string, configName: string) {
    this.lock = new AwaitLock();

    this.formatterConfig = resolve(formatterDir + "/" + configName);
  }

  async format(files: string[] | string): Promise<void> {
    if (files.length === 0) return;
    if (!Array.isArray(files)) files = [files];
    let fileString = "";
    for (let file of files) {
      fileString += `"${file}" `;
    }
    await this.lock.acquireAsync();
    return new Promise((resolve, reject) => {
      exec(
        `${this.ideaPath} format -s ${this.formatterConfig} ${fileString}`,
        { cwd: "."},
        error => {
          this.lock.release();
          if (error !== null) reject(error);
          resolve();
      })
    });
  }
}

export default IntelliJFormatter;
