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

/**
 * A client to interact with the BitBucket API
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

  private getRepoPart(): string {
    if (this.isUserRepo) {
      return join("1.0/users", this.project, "repos", this.repo);
    }
    return join("1.0/projects", this.project, "repos", this.repo);
  }

  async fetchPullRequest(pullRequestId: number): Promise<PullRequestData> {
    let response = await this.get(join(
      this.getRepoPart(), "pull-requests", pullRequestId.toString()));
    return await response.json() as PullRequestData;
  }

  /**
   * Fetches all open pull requests for a specific repository
   * @returns The data for all open pull request of the specific repository
   */
  async fetchPullRequests(): Promise<PullRequestResponse> {
    let response = await this.get(join(
      this.getRepoPart(), "pull-requests"));
    return await response.json() as PullRequestResponse;
  }

  async commentPullRequest(comment: string, pullRequestId: number): Promise<void> {
    let response = await this.post(join(
      this.getRepoPart(), "pull-requests", pullRequestId.toString(), "comments"
    ), JSON.stringify({"text": comment}));
    if (!response.ok) throw new Error(response.statusText);
  }

  async fetchRepository(): Promise<RepositoryData> {
    let response = await this.get(this.getRepoPart());
    return await response.json() as RepositoryData;
  }

  async fetchDiff(pullRequestId: number): Promise<DiffResponse> {
    let response = await this.get(join(
      this.getRepoPart(), "pull-requests", pullRequestId.toString(), "diff"
    ));
    return await response.json() as DiffResponse;
  }

  private async writePRs(): Promise<[boolean, any]> {
    let serializableObject: { [key: number]: PullRequestData } = {};
    for (let [key, value] of this.pullRequests as Map<Number, PullRequestData>) {
      serializableObject[+key] = value;
    }
    let success = await writeFile(
      "./.bb-pr-data",
      JSON.stringify(serializableObject),
      { encoding: "utf-8" });
    if (success === undefined) return [true, success];
    return [false, success];
  }

  private async readPRs(): Promise<Map<Number, PullRequestData>> {
    let file = readFileSync("./.bb-pr-data", { encoding: "utf-8" });
    let map: Map<Number, PullRequestData> = new Map();
    for (let [index, data] of Object.entries(JSON.parse(file)) as [string, PullRequestData][]) {
      map.set(+index, data);
    }
    return map;
  }



  public static extractCloneURL(repoData: RepositoryData): string | undefined {
    return repoData.links.clone.find(element => element.name === "http")?.href;
  }

  public startHeartbeat(): SetIntervalAsyncTimer {
    const client = this;
    async function heartBeat() {
      client.emit("heartbeat");

      // fetch pull request regularly and check for updates
      await (async function() {
        let pullRequests = (await client.fetchPullRequests()).values;
        if (client.pullRequests === null) {
          try {
            client.pullRequests = await client.readPRs();
          }
          catch (e) {
            console.error(e);
            client.pullRequests = new Map();
            return;
          }
        }

        let pRIdSet = new Set(client.pullRequests.keys()); // set of pr ids
        for (let pullRequest of pullRequests) {
          if (!client.pullRequests.has(pullRequest.id)) {
            client.emit("prCreate", pullRequest);
            client.pullRequests.set(pullRequest.id, pullRequest)
          }
          pRIdSet.delete(pullRequest.id); // remove from set
        }
        for (let pRIdElement of pRIdSet) {
          // every remaining element from the set has been closed
          client.emit("prClose", client.pullRequests.get(pRIdElement));
          client.pullRequests.delete(pRIdElement);
        }

        // store the updated PRs to a file to restore it eventually with it
        client.writePRs().then(([success, value]) => {
          if (!success) console.error(value);
        });
      })();

    }

    return setIntervalAsync(heartBeat, 1000 * 20);
  }
}

export default BitBucketClient;
