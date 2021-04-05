import * as winston from "winston";
import dayjs from "dayjs";

// Some convenience constants.
const {createLogger, format, transports} = winston;
const {combine, timestamp, label, printf} = format;
const colorize = winston.format.colorize().colorize;

// The directory to output the log files.
const logDir = "./log";

/**
 * Integration of a winston logger.
 */
class Logger {
  private readonly winston: winston.Logger;

  /**
   * Constructor.
   *
   * @param object The object to display logs for.
   */
  constructor(object: object | string) {
    // Use either the name of the object class's name or the string directly.
    let labelName: string;
    if (typeof object === "string") {
      labelName = object;
    }
    else {
      labelName = Object.getPrototypeOf(object).constructor.name;
    }

    // The output format for the console.
    const consoleFormat = combine(
      label({label: labelName}),
      timestamp({
        format: dayjs().format("HH:mm:ss")
      }),
      printf(msg => {
        return `[${msg.timestamp}]`
          + "["
          + colorize(msg.level, `${msg.label}/${msg.level.toUpperCase()}`)
          + "]: "
          + `${colorize(msg.level, msg.message)}`;
      })
    );

    // The output format for the files.
    const fileFormat = combine(
      label({label: labelName}),
      timestamp({
        format: dayjs().format("YYYY-MM-DD HH:mm:ss,SSS")
      }),
      printf(msg => {
        let printLevel = msg.level.toUpperCase();
        while (printLevel.length < 7) printLevel = " " + printLevel;
          return `${msg.timestamp} `
            + `[${require("process").pid}] `
            + printLevel
            + " - "
            + msg.label
            + " - "
            + msg.message;
        }
      )
    )

    // The logger from winston.
    this.winston = createLogger({
      transports: [
        new transports.Console({
          // Log everything into the console.
          level: "silly",
          format: consoleFormat
        }),
        new winston.transports.File({
          // Log everything into "./log/all.log".
          level: "silly",
          filename: "all.log",
          dirname: logDir,
          format: fileFormat
        }),
        new winston.transports.File({
          // Log info and more into "./log/info.log".
          level: "info",
          filename: "info.log",
          dirname: logDir,
          format: fileFormat
        }),
        new winston.transports.File({
          // Log only errors into "./log/error.log".
          level: "error",
          filename: "error.log",
          dirname: logDir,
          format: fileFormat
        })
      ]
    });
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to error.
   *
   * @param message The message to log.
   */
  error(message: string) {
    this.winston.error(message);
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to warn.
   *
   * @param message The message to log.
   */
  warn(message: string) {
    this.winston.warn(message);
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to info.
   *
   * @param message The message to log.
   */
  info(message: string) {
    this.winston.info(message);
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to http.
   *
   * @param message The message to log.
   */
  http(message: string) {
    this.winston.http(message);
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to verbose.
   *
   * @param message The message to log.
   */
  verbose(message: string) {
    this.winston.verbose(message);
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to debug.
   *
   * @param message The message to log.
   */
  debug(message: string) {
    this.winston.debug(message);
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to silly.
   *
   * @param message The message to log.
   */
  silly(message: string) {
    this.winston.silly(message);
  }

}

export default Logger;
