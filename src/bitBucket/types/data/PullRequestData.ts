import RefData from "./RefData";
import PullRequestParticipantData from "./PullRequestParticipantData";
import PullRequestPropertiesData from "./PullRequestPropertiesData";
import LinksData from "./LinksData";

export default interface PullRequestData {
  id: number,
  version: number,
  title: string,
  description: string,
  state: "OPEN" | "DECLINED" | "MERGED",
  open: boolean,
  closed: boolean,
  createdDate: number,
  updatedDate: number,
  fromRef: RefData,
  toRef: RefData,
  locked: boolean,
  author: PullRequestParticipantData,
  reviewers: Array<PullRequestParticipantData>,
  participants: Array<PullRequestParticipantData>,
  properties: PullRequestPropertiesData,
  links: LinksData
}
