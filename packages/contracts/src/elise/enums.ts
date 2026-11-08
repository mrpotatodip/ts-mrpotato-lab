// -----
// Keys of the system rows in
// party_master_types in db-elise.
// -----
export const PARTY_TYPE_VALUES = ["person", "organization"] as const;

export type PartyTypeValue = (typeof PARTY_TYPE_VALUES)[number];

// -----
// The Role keys the code itself relies on. Every
// other Role key is data in access_master_roles.
// -----
export const TENANT_ADMIN_ROLE_KEY = "tenant_admin";

// -----
// Last segment of a Power path. The tree of
// nodes in front of it lives in access/.
// -----
export const ACCESS_ACTION_VALUES = [
  "read",
  "create",
  "update",
  "delete",
  "archive",
  "reorder",
  "publish",
  "dismiss",
] as const;

export type AccessActionValue = (typeof ACCESS_ACTION_VALUES)[number];

export const INVITE_CODE_STATUS_VALUES = ["active", "used_up", "expired", "revoked"] as const;

export type InviteCodeStatusValue = (typeof INVITE_CODE_STATUS_VALUES)[number];

// -----
// Scans. Twins of the CHECK constraints on
// scans, scan_findings and scan_finding_triage in db-elise;
// change both together.
// -----
export const SCAN_STATE_VALUES = ["queued", "running", "succeeded", "failed"] as const;
export const FINDING_STATUS_VALUES = ["confirmed", "needs_validation"] as const;
export const FINDING_SEVERITY_VALUES = ["critical", "high", "medium", "low", "informational"] as const;
// -----
// A finding in a scan is new there, or carried from an
// earlier scan after the agent re-checked it.
// -----
export const FINDING_ORIGIN_VALUES = ["new", "carried"] as const;
export const REPO_FINDING_STATE_VALUES = ["open", "fixed_by_code", "regressed"] as const;
export const FINDING_TRIAGE_STATUS_VALUES = ["open", "fixed", "false_positive", "accepted_risk"] as const;

export type ScanStateValue = (typeof SCAN_STATE_VALUES)[number];
export type FindingOriginValue = (typeof FINDING_ORIGIN_VALUES)[number];
export type RepoFindingStateValue = (typeof REPO_FINDING_STATE_VALUES)[number];
export type FindingStatusValue = (typeof FINDING_STATUS_VALUES)[number];
export type FindingSeverityValue = (typeof FINDING_SEVERITY_VALUES)[number];
export type FindingTriageStatusValue = (typeof FINDING_TRIAGE_STATUS_VALUES)[number];

// -----
// Where a running scan is: cloning the repo, the agent
// auditing it, or saving its files.
// -----
export const SCAN_STEP_VALUES = ["cloning", "auditing", "saving"] as const;

export type ScanStepValue = (typeof SCAN_STEP_VALUES)[number];
