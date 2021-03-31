class CheckstyleCheck {

  constructor(
    readonly type: "ERROR" | "WARN" | string,
    readonly path: string,
    readonly lineNumber : number,
    readonly characterNumber: number,
    readonly comment: string,
    readonly moduleName: string
  ) {}

  toString(): string {
    return `[${this.type}] `
      + this.path + ":"
      + (isNaN(this.lineNumber) ? "" : this.lineNumber + ":")
      + (isNaN(this.characterNumber) ? "" : this.characterNumber + ":")
      + " " + this.comment
      + ` [${this.moduleName}]`;
  }

  static fromString(line: string): CheckstyleCheck | null {
    if (!line.startsWith("[")) return null;
    let pattern =
      /^\[(ERROR|WARN)] ((?:\w:)?[\w\\\-.]+):(?:(\d+):)?(?:(\d+):)? ([\w\s.]+) \[(\w+)]/;
    let match = line.match(pattern);

    if (match?.length === 7) {
      let type = match[1];
      let path = match[2];
      let lineNumber = +match[3];
      let characterNumber = +match[4];
      let comment = match[5];
      let moduleName = match[6];

      return new CheckstyleCheck(
        type, path, lineNumber, characterNumber, comment, moduleName);
    }

    return null;
  }

  isError(): boolean {
    return this.type === "ERROR";
  }
  isWarning(): boolean {
    return this.type === "WARN";
  }
}

export default CheckstyleCheck;
