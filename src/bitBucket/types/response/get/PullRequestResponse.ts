import PullRequestData from "../../data/PullRequestData";

export default interface PullRequestResponse {
  size: number,
  limit: number,
  isLastPage: boolean,
  values: Array<PullRequestData>
}
