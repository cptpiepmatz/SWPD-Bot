import ProjectData from "./ProjectData";
import LinksData from "./LinksData";

export default interface RepositoryData {
  slug: string,
  id: number,
  name: string,
  scmId: string,
  state: string | "AVAILABLE",
  statusMessage: string,
  forkable: boolean,
  origin?: RepositoryData
  project?: ProjectData,
  public: boolean,
  links: LinksData & { clone: Array<{ href: string, name: string }> }
}
