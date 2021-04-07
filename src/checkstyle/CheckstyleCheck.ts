/**
 * Class holding information about a checkstyle check.
 */
import Logger from "../logger/Logger";

class CheckstyleCheck {
  private readonly logger: Logger;

  /**
   * Constructor.
   *
   * @param severity The severity of the check
   * @param path The path of the checked file
   * @param lineNumber The line number the check failed
   * @param characterNumber The character number the check failed
   * @param comment The comment the checker spilled out
   * @param moduleName The module calling the failed check
   */
  constructor(
    readonly severity: "ERROR" | "WARN" | string,
    readonly path: string,
    readonly lineNumber: number,
    readonly characterNumber: number,
    readonly comment: string,
    readonly moduleName: string
  ) {
    this.logger = new Logger(this);
    this.logger.silly("Constructor done");
    this.logger
      .debug("Constructed Check:")
      .debug("  severity: " + severity)
      .debug("  path: " + path)
      .debug("  lineNumber: " + lineNumber)
      .debug("  characterNumber: " + characterNumber)
      .debug("  comment: " + comment)
      .debug("  moduleName: " + moduleName);
  }

  /**
   * Formats the check back to the same format it was before parsing.
   *
   * @returns A string containing all the check information.
   */
  toString(): string {
    this.logger.silly("Stringifying Check");
    return `[${this.severity}] `
      + this.path + ":"
      + (isNaN(this.lineNumber) ? "" : this.lineNumber + ":")
      + (isNaN(this.characterNumber) ? "" : this.characterNumber + ":")
      + " " + this.comment
      + ` [${this.moduleName}]`;
  }

  /**
   * Static method to parse a check string into an object.
   *
   * @param line The line of string that should be parsed
   * @returns The check object if the input was parsable
   */
  static fromString(line: string): CheckstyleCheck | null {
    // If the line doesn't event start with a "[" it can't be the correct format.
    // Further matching would be a waste of time here.
    if (!line.startsWith("[")) return null;

    /*
     * The pattern used to match the input.
     *
     * "^"                     Check from the beginning of the line.
     * "\[(ERROR|WARN)]"       Check for the severity of the check.
     * "((?:\w:)?[\w\\\-.]+):" Matches for the path the check outputs.
     * > "(?:\w:)?"            This part is being used to match for drive
     *                          letters in windows.
     * > "[\w\\\-.]+)"         This part checks for the rest of path.
     * > ":"                   This separates the path from the line numbers.
     * "(?:(\d+):)?"           The first time it matches for the line number,
     *                          the second time for the character number.
     * "([\w\s.]+)"            Matches for the comment the module spilled out.
     * "\[(\w+)]"              Matches for the module name in the end.
     */
    let pattern =
      /^\[(ERROR|WARN)] ((?:\w:)?[\w\\\-.]+):(?:(\d+):)?(?:(\d+):)? ([\w\s.]+) \[(\w+)]/;
    let match = line.match(pattern);

    new Logger("CheckstyleCheck#fromString").debug(JSON.stringify(match));

    if (match?.length === 7) {
      let severity = match[1];
      let path = match[2];
      let lineNumber = +match[3]; // Convert the string into numbers.
      let characterNumber = +match[4];
      let comment = match[5];
      let moduleName = match[6];

      return new CheckstyleCheck(
        severity, path, lineNumber, characterNumber, comment, moduleName);
    }

    return null;
  }

  /**
   * Transforms the check into a easily readable markdown formatted string.
   * <p>This is used to post it later under a pull request in BitBucket.
   *
   * @returns The for markdown formatted string
   */
  toMarkdown(): string {
    this.logger.silly("Making Markdown for Check");
    let typeDisplay: string;
    switch (this.severity) {
      case "ERROR":
        typeDisplay = "❌";
        break;
      case "WARN":
        typeDisplay = "⚠️";
        break;
      default:
        typeDisplay = "❓";
    }

    let lines = ":" + this.lineNumber;
    if (!isNaN(this.characterNumber)) lines += ":" + this.characterNumber;

    let finishedMarkdown =
      `**${typeDisplay} ${this.comment}** (*${this.getJavaClass()}${lines}*)`;
    this.logger.debug("Finished Markdown: " + finishedMarkdown);

    return finishedMarkdown;
  }

  get isError(): boolean {
    return this.severity === "ERROR";
  }

  get isWarning(): boolean {
    return this.severity === "WARN";
  }

  /**
   * This method transforms the path of the check into the java class.
   *
   * @returns A string with the name of the java class
   */
  getJavaClass(): string {
    this.logger.silly("Getting Java Class");
    let javaLastIndex = this.path.lastIndexOf("/java/");

    // Java code is typically stored in "java" directory
    if (javaLastIndex === -1) javaLastIndex = this.path.lastIndexOf("\\java\\");
    let javaClassString = this.path.substring(javaLastIndex + 6);
    javaClassString = javaClassString
      .substring(0, javaClassString.length - 5)
      .replace(/[\/\\]/g, ".");

    this.logger.debug(`Found "${javaClassString}" in "${this.path}"`);

    return javaClassString;
  }
}

export default CheckstyleCheck;
