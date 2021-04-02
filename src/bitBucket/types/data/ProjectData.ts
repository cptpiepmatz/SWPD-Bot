import LinksData from "./LinksData";

export default interface ProjectData {
  key: string,
  id: number,
  name: string,
  public: boolean,
  type: string,
  links: LinksData
}
