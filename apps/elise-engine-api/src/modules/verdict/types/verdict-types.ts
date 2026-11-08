import type { FindingSeverityValue, FindingTriageStatusValue } from "@repo/contracts/elise";

// -----
// A succeeded lite scan of the commit. The two counts come
// from the scan's re-check of the History; null means the
// scan asked about nothing (a scan of a ref, or one from
// before re-checks).
// -----
export type JudgedScan = {
  id: string;
  createdAt: Date;
  priorsGiven: number | null;
  priorsUnchecked: number | null;
};

export type JudgedFinding = {
  scanId: string;
  fingerprint: string;
  title: string;
  severity: FindingSeverityValue | null;
  class: string;
  file: string | null;
  line: number | null;
};

export type JudgedTriage = {
  fingerprint: string;
  status: FindingTriageStatusValue;
  note: string | null;
  acceptedUntil: Date | null;
};

export type JudgeInput = {
  commit: string;
  scans: JudgedScan[];
  findings: JudgedFinding[];
  triage: JudgedTriage[];
  now: Date;
};
