import HunkData from "./HunkData";
import LocationData from "./LocationData";

export default interface DiffData {
  source: LocationData | null,
  destination: LocationData,
  hunks: Array<HunkData>,
  truncated: boolean
}
