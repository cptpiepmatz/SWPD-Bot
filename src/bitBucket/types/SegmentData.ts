import LineData from "./LineData";

export default interface SegmentData {
  type: "CONTEXT" | "ADDED" | string,
  lines: Array<LineData>,
  truncated: false
}
