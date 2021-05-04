import * as winston from "winston";
import dayjs from "dayjs";
import dotenv from "dotenv";
import DiscordWebhookTransport from "./DiscordWebhookTransport";
import { MessageBuilder } from "discord-webhook-node";

// Some convenience constants.
const {createLogger, format, transports} = winston;
const {combine, timestamp, label, printf} = format;
const colorize = winston.format.colorize().colorize;

// The directory to output the log files.
const logDir = "./log";

// Url for the Discord webhook. Will be updated via setter in the logger.
let webhookUrl: string | null = null;

let webhookPings: string[] = [];

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
    // Use dotenv to load environmental variables.
    // Used to define the LOGLEVEL.
    dotenv.config();

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
      timestamp(),
      printf(msg => {
        return `[${dayjs(msg.timestamp).format("HH:mm:ss")}]`
          + "["
          + colorize(msg.level, `${msg.label}/${msg.level.toUpperCase()}`)
          + "]: "
          + `${colorize(msg.level, msg.message)}`;
      })
    );

    // The output format for the files.
    const fileFormat = combine(
      label({label: labelName}),
      timestamp(),
      printf(msg => {
        let printLevel = msg.level.toUpperCase();
        while (printLevel.length < 7) printLevel = " " + printLevel;
          return `${dayjs(msg.timestamp).format("YYYY-MM-DD HH:mm:ss,SSS")} `
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
          level: process.env.LOGLEVEL?.toLowerCase() || "info",
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
          // Log verbose and more into "./log/verbose.log".
          level: "verbose",
          filename: "verbose.log",
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
        }),
        new DiscordWebhookTransport(
          webhookUrl,
          {
            level: "info",
            format: combine(label({label: labelName}), format.colorize())
          },
          webhookPings
          )
      ]
    });
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to error.
   *
   * @param message The message to log.
   */
  error(message: string): Logger {
    this.winston.error(message);
    return this;
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to warn.
   *
   * @param message The message to log.
   */
  warn(message: string): Logger {
    this.winston.warn(message);
    return this;
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to info.
   *
   * @param message The message to log.
   */
  info(message: string): Logger {
    this.winston.info(message);
    return this;
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to http.
   *
   * @param message The message to log.
   */
  http(message: string): Logger {
    this.winston.http(message);
    return this;
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to verbose.
   *
   * @param message The message to log.
   */
  verbose(message: string): Logger {
    this.winston.verbose(message);
    return this;
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to debug.
   *
   * @param message The message to log.
   */
  debug(message: string): Logger {
    this.winston.debug(message);
    return this;
  }

  /**
   * Wrapper method for the winston logger.
   * <p>Logs to silly.
   *
   * @param message The message to log.
   */
  silly(message: string): Logger {
    this.winston.silly(message);
    return this;
  }

}

/**
 * Sets the webhook url for the discord webhook transport. Needs to be set
 * before creating the logger using it.
 *
 * @param url Url for the webhook
 */
export function setWebhookUrl(url: string) {
  webhookUrl = url;
}

/**
 * Set the webhook pings for the discord webhook transport. Needs to be set
 * before creating the logger using it.
 *
 * @param pings Array of ids to ping for.
 */
export function setWebhookPings(pings: string[]) {
  webhookPings = pings;
}

export default Logger;
