import fetch, { BodyInit, Headers, Response } from "node-fetch";
import { encode } from "base-64";
import { join } from "path";
import PullRequestResponse from "./types/response/get/PullRequestResponse";
import EventEmitter from "events";
import PullRequestData from "./types/data/PullRequestData";
import { setIntervalAsync, SetIntervalAsyncTimer } from "set-interval-async/dynamic";
import RepositoryData from "./types/data/RepositoryData";
import { writeFile } from "fs/promises";
import { readFileSync } from "fs";
import DiffResponse from "./types/response/get/DiffResponse";
import deepEqual from "deep-equal";

/**
 * A client to interact with the BitBucket API.
 * <p>It's dedicated to only one repository.
 */
class BitBucketClient extends EventEmitter {
  protected pullRequests: Map<Number, PullRequestData> | null = null;

  /**
   * Constructor for the client
   *
   * @param host The host of the BitBucket server
   * @param user The user to log in
   * @param token The token (or password if no token was generated)
   * @param project The project the repository is in
   * @param repo The repository to work with
   * @param isUserRepo Is the working repo a user repository or a project one
   */
  constructor(
    private readonly host: string,
    private readonly user: string,
    private readonly token: string,
    private readonly project: string,
    private readonly repo: string,
    private readonly isUserRepo: boolean
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
    headers.set("Content-Type", "application/json");
    return headers;
  }

  /**
   * Helper method to access the api via get requests
   *
   * @param path The api part to access
   * @returns The response of the server
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
   * @returns The response of the server
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
   * Helper method to get the part of the api used for repos.
   *
   * @private
   */
  private getRepoPart(): string {
    if (this.isUserRepo) {
      return join("1.0/users", this.project, "repos", this.repo);
    }
    return join("1.0/projects", this.project, "repos", this.repo);
  }

  /**
   * Fetches a specific pull request by it's id.
   *
   * @param pullRequestId The id of the pull request to fetch
   * @returns The data of the fetched pull request
   */
  async fetchPullRequest(pullRequestId: number): Promise<PullRequestData> {
    let response = await this.get(join(
      this.getRepoPart(), "pull-requests", pullRequestId.toString()));
    return await response.json() as PullRequestData;
  }

  /**
   * Fetches all open pull requests.
   *
   * @returns The data for all open pull requests
   */
  async fetchPullRequests(): Promise<PullRequestResponse> {
    let response = await this.get(join(
      this.getRepoPart(), "pull-requests"));
    return await response.json() as PullRequestResponse;
  }

  /**
   * Comments under a specified pull request.
   *
   * @param comment The comment to post under the pull request
   * @param pullRequestId The id of the pull request to comment under
   */
  async commentPullRequest(comment: string, pullRequestId: number): Promise<void> {
    let response = await this.post(join(
      this.getRepoPart(), "pull-requests", pullRequestId.toString(), "comments"
    ), JSON.stringify({"text": comment}));
    if (!response.ok) throw new Error(response.statusText);
  }

  /**
   * Fetches the data for the repository.
   *
   * @returns The data of the repository.
   */
  async fetchRepository(): Promise<RepositoryData> {
    let response = await this.get(this.getRepoPart());
    return await response.json() as RepositoryData;
  }

  /**
   * Fetches the diff for a pull request.
   *
   * @param pullRequestId The id of the pull request
   * @returns The response including the data for the diff
   */
  async fetchDiff(pullRequestId: number): Promise<DiffResponse> {
    let response = await this.get(join(
      this.getRepoPart(), "pull-requests", pullRequestId.toString(), "diff"
    ));
    return await response.json() as DiffResponse;
  }

  /**
   * Helper method to write the local pull request in a permanent cache.
   *
   * @private
   */
  private async writePRs(): Promise<void> {
    let serializableObject: { [key: number]: PullRequestData } = {};
    for (let [key, value] of this.pullRequests as Map<Number, PullRequestData>) {
      serializableObject[+key] = value;
    }
    let result = await writeFile(
      "./.bb-pr-data",
      JSON.stringify(serializableObject),
      {encoding: "utf-8"});
    if (result === undefined) return;
    throw result;
  }

  /**
   * Helper method to read from the permanent cache.
   * <p>Used for restoring the local pull requests.
   *
   * @private
   */
  private async readPRs(): Promise<Map<Number, PullRequestData>> {
    let file = readFileSync("./.bb-pr-data", {encoding: "utf-8"});
    let map: Map<Number, PullRequestData> = new Map();
    for (let [index, data] of Object.entries(JSON.parse(file)) as [string, PullRequestData][]) {
      map.set(+index, data);
    }
    return map;
  }

  /**
   * Static method used to extract the clone url from repository data.
   *
   * @param repoData The repository data to extract the clone url from
   * @returns The clone url if available, usually it is available
   */
  public static extractCloneURL(repoData: RepositoryData): string | undefined {
    return repoData.links.clone.find(element => element.name === "http")?.href;
  }

  /**
   * Method used to start the polling the client to interact with the api
   * regularly.
   * <p>This will also let the client start to emit events.
   *
   * @returns The interval async timer to allow to modify the heartbeat later on
   */
  public startHeartbeat(): SetIntervalAsyncTimer {
    // In the heartbeat function the `this` reference gets lost.
    const client = this;

    /**
     * Nested function to easily invoke the heartbeat of the client.
     */
    async function heartBeat() {
      /**
       * This event gets called everytime the client pulls fresh data from the
       * server.
       *
       * @event BitBucketClient#heartbeat
       */
      client.emit("heartbeat");

      let pullRequests = (await client.fetchPullRequests()).values;
      if (client.pullRequests === null) {
        // If `client.pullRequests` is null the client hasn't stored any PRs.
        try {
          // Trying to read the PRs from the permanent cache file.
          client.pullRequests = await client.readPRs();
        }
        catch (e) {
          // If reading the file is not possible the client will start without
          // any local data.
          console.error(e);
          client.pullRequests = new Map();
        }
      }

      for (let remotePR of pullRequests) {
        // Iterate over the remote pull requests to check for updates
        let localPR = client.pullRequests.get(remotePR.id);
        if (!deepEqual(remotePR, localPR)) {
          /**
           * This event gets called when the local pull request is not up to
           * date with the one from the server.
           *
           * @event BitBucketClient#prUpdate
           * @param {PullRequestData} oldPR The local, old pull request
           * @param {PullRequestData} newPR The remote, new pull request from the server
           */
          client.emit("prUpdate", localPR, remotePR);
        }
      }

      // Use a set to memorize which PR IDs the client knows
      let pRIdSet = new Set(client.pullRequests.keys());
      for (let remotePR of pullRequests) {
        // Iterate over the remote pull requests to check if there are any new
        // ones.
        if (!client.pullRequests.has(remotePR.id)) {
          /**
           * This event gets called everytime the client recognizes a pull
           * request as a new one.
           *
           * @event BitBucketClient#prCreate
           * @param {PullRequestData} pullRequest The newly created pull request
           */
          client.emit("prCreate", remotePR);
        }
        // Update the local PRs.
        client.pullRequests.set(remotePR.id, remotePR);

        /*
         * Remove the PR from the set defined early.
         *
         * This will allow later on to recognize which PRs are only stored
         * locally now.
         */
        pRIdSet.delete(remotePR.id);
      }

      for (let pRIdElement of pRIdSet) {
        // Iterate over all the remaining local PR IDs.

        /**
         * This event gets called when a pull request gets closed on the
         * server side.
         *
         * @event BitBucketClient#prClose
         * @param {PullRequestData} pullRequest The closed pull request
         */
        client.emit("prClose", client.pullRequests.get(pRIdElement));

        // Finally delete the locally stored pull request.
        client.pullRequests.delete(pRIdElement);
      }

      // Store the updated PRs to a file to restore it eventually with it.
      client.writePRs().catch(console.error);

    }

    // Call the heartbeat function every minute.
    return setIntervalAsync(heartBeat, 1000 * 60);
  }
}

export default BitBucketClient;
