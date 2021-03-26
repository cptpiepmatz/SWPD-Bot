import LinksData from "./LinksData";

export default interface UserData {
  name: string,
  emailAddress: string,
  id: number,
  displayName: string,
  active: boolean,
  slug: string,
  type: string,
  links: LinksData
}
