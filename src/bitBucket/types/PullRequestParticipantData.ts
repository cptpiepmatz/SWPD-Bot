import UserData from "./UserData";

export default interface PullRequestParticipantData {
  user: UserData,
  role: string | "AUTHOR" | "REVIEWER",
  approved: boolean,
  status: string
}
