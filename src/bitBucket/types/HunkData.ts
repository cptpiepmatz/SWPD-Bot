import SegmentData from "./SegmentData";

export default interface HunkData {
  context: string,
  sourceLine: number,
  sourceSpan: number,
  destinationLine: number,
  destinationSpan: number,
  segments: Array<SegmentData>,
  truncated: boolean
}
