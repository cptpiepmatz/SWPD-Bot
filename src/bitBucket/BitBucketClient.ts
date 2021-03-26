import fetch, {BodyInit, Headers, Response} from "node-fetch";
import {encode} from "base-64";
import {join} from "path";
import PullRequestResponse from "./response/get/PullRequestResponse";

class BitBucketClient {

  constructor(
      private readonly host: string,
      private readonly user: string,
      private readonly token: string,
      private readonly project: string,
      private readonly repo: string
  ) {}

  private getPath(path: string): string {
    return new URL(join("rest/api", path), this.host).toString();
  }

  private getHeaders(): Headers {
    let headers = new Headers();
    headers.set("Authorization", "Basic " + encode(this.user + ":" + this.token));
    return headers;
  }

  private async get(path: string): Promise<Response> {
    console.log(this.getPath(path));
    return await fetch(this.getPath(path), {
      method: "get",
      headers: this.getHeaders()
    });
  }

  private async post(path: string, body: BodyInit): Promise<Response> {
    return await fetch(this.getPath(path), {
      method: "post",
      body: body,
      headers: this.getHeaders()
    });
  }

  public async fetchPullRequests(): Promise<PullRequestResponse> {
    let response = await this.get(join(
      "1.0/projects", this.project, "repos", this.repo, "pull-requests"));
    return await response.json() as PullRequestResponse;
  }

}

export default BitBucketClient;
