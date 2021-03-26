export default interface PullRequestPropertiesData {
  mergeResult: {
    outcome: string,
    current: boolean
  },
  resolvedTaskCount: number,
  commentCount: number,
  openTaskCount: number
}
