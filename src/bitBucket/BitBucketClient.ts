import fetch, { BodyInit, Headers, Response } from "node-fetch";
import { encode } from "base-64";
import { join } from "path";
import PullRequestResponse from "./response/get/PullRequestResponse";
import EventEmitter from "events";
import PullRequestData from "./types/PullRequestData";
import { setIntervalAsync, SetIntervalAsyncTimer } from "set-interval-async/dynamic";

/**
 * A client to interact with the BitBucket API
 */
class BitBucketClient extends EventEmitter {
  protected pullRequests: Map<Number, PullRequestData>
    = new Map<Number, PullRequestData>();

  /**
   * Constructor for the client
   *
   * @param host The host of the BitBucket server
   * @param user The user to log in
   * @param token The token (or password if no token was generated)
   * @param project The project the repository is in
   * @param repo The repository to work with
   */
  constructor(
    private readonly host: string,
    private readonly user: string,
    private readonly token: string,
    private readonly project: string,
    private readonly repo: string
  ) {
    super();
  }

  /**
   * Helper method to create the full api path
   *
   * @param path The api part in the path
   * @returns The full path to access the api
   * @private
   */
  private getPath(path: string): string {
    return new URL(join("rest/api", path), this.host).toString();
  }

  /**
   * Helper method to create the necessary headers for the request
   *
   * @returns The necessary header for the request
   * @private
   */
  private getHeaders(): Headers {
    let headers = new Headers();
    headers.set("Authorization", "Basic " + encode(this.user + ":" + this.token));
    return headers;
  }

  /**
   * Helper method to access the api via get requests
   *
   * @param path The api part to access
   * @private
   */
  private async get(path: string): Promise<Response> {
    return await fetch(this.getPath(path), {
      method: "get",
      headers: this.getHeaders()
    });
  }

  /**
   * Helper method to access the api via post requests
   *
   * @param path The api part to access
   * @param body The body to post onto the server
   * @private
   */
  private async post(path: string, body: BodyInit): Promise<Response> {
    return await fetch(this.getPath(path), {
      method: "post",
      body: body,
      headers: this.getHeaders()
    });
  }

  /**
   * Fetches all open pull requests for a specific repository
   * @returns The data for all open pull request of the specific repository
   */
  public async fetchPullRequests(): Promise<PullRequestResponse> {
    let response = await this.get(join(
      "1.0/projects", this.project, "repos", this.repo, "pull-requests"));
    return await response.json() as PullRequestResponse;
  }

  public startHeartbeat(): SetIntervalAsyncTimer {
    const client = this;
    async function heartBeat() {
      client.emit("heartbeat");

      // fetch pull request regularly and check for updates
      await (async function() {
        let pullRequests = (await client.fetchPullRequests()).values;
        if (client.pullRequests.size === 0) {
          for (let pullRequest of pullRequests) {
            client.pullRequests.set(pullRequest.id, pullRequest);
          }
          return;
        }

        let pRIdSet = new Set(client.pullRequests.keys()); // set of pr ids
        for (let pullRequest of pullRequests) {
          if (!client.pullRequests.has(pullRequest.id)) {
            client.emit("prCreate", pullRequest);
          }
          pRIdSet.delete(pullRequest.id); // remove from set
        }
        for (let pRIdElement of pRIdSet) {
          // every remaining element from the set has been closed
          client.emit("prClosed", client.pullRequests.get(pRIdElement));
          client.pullRequests.delete(pRIdElement);
        }
      })();

    }

    return setIntervalAsync(heartBeat, 1000 * 60);
  }
}

export default BitBucketClient;
