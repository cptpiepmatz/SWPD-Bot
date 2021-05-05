import Transport, { TransportStreamOptions } from "winston-transport";
import { MessageBuilder, Webhook, WebhookOptions } from "discord-webhook-node";
import { ansi16 } from "color-convert";

/**
 * A winston transport to log into a discord webhook.
 */
class DiscordWebhookTransport extends Transport {

  private readonly webhook : Webhook | undefined;

  /**
   * Constructor.
   * @param webhookOpts Options for the webhook
   * @param transportOpts Transport options as for every winston transport
   * @param notifyList A list of ids to ping on error
   */
  constructor(private readonly webhookOpts: string | WebhookOptions | null,
              transportOpts: TransportStreamOptions,
              private readonly notifyList: string[]
              ) {
    super(transportOpts);
    if (webhookOpts) this.webhook = new Webhook(webhookOpts);
  }

  /**
   * Log override for the transport.
   *
   * @param info The data to transport
   * @param next The callback
   */
  log(info: any, next: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // convert ansi color to hex
    let level = info[Symbol.for("level")];
    let levelIndex = info.level.indexOf(level);
    let levelColorAnsi = info.level.substring(2, levelIndex - 1);
    let levelColorHex = parseInt(ansi16.hex(levelColorAnsi), 16);

    let message = new MessageBuilder();
    message
      .setTitle(info.label)
      .setColor(levelColorHex)
      .setAuthor(level.toUpperCase())
      .setDescription(info.message)
      .setTimestamp();

    if (this.notifyList.length > 0 && level === "error") {
      let notifyPings = "";
      for (let notify of this.notifyList) {
        notifyPings += "<@" + notify + "> ";
      }
      message.setText(notifyPings);
    }

    this.webhook?.send(message).catch(error => console.error(error));
    next();
  }

}

export default DiscordWebhookTransport;
