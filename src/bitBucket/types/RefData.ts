import RepositoryData from "./RepositoryData";

export default interface RefData {
  id: string,
  displayId: string,
  latestCommit: string,
  repository: RepositoryData
}
