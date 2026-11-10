import { FindingTriageSelect } from "#/modules/finding";
import { scanKeys, type DecideFindingProps } from "#/modules/scan";
import { repoKeys } from "../hooks";

// -----
// The decision control of a verdict, for any screen that shows one. The
// scan module cannot import the finding module, so a screen passes this in.
// A saved decision refreshes the repository's counts and every scan read.
// -----
export function RepoVerdictDecision({ repoId, repoUrl, finding }: DecideFindingProps) {
  return <FindingTriageSelect finding={{ repo: repoUrl, fingerprint: finding.fingerprint, title: finding.title, triage: null }} also={[repoKeys.detail(repoId), scanKeys.all]} />;
}
