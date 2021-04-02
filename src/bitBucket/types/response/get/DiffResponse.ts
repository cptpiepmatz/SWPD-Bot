import DiffData from "../../data/DiffData";

export default interface DiffResponse {
  fromHash: string,
  toHash: string,
  contextLines: number,
  whitespace: "SHOW" | string,
  diffs: Array<DiffData>,
  truncated: boolean
}
