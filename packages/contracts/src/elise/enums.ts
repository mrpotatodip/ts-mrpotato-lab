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
  "manage",
] as const;

export type AccessActionValue = (typeof ACCESS_ACTION_VALUES)[number];

export const INVITE_CODE_STATUS_VALUES = ["active", "used_up", "expired", "revoked"] as const;

export type InviteCodeStatusValue = (typeof INVITE_CODE_STATUS_VALUES)[number];

// -----
// Whether a Team invite's email went out. Twin of the CHECK
// constraint on tenant_team_invites in db-elise.
// -----
export const INVITE_EMAIL_STATUS_VALUES = ["not_sent", "sent", "failed"] as const;

export type InviteEmailStatusValue = (typeof INVITE_EMAIL_STATUS_VALUES)[number];

// -----
// Scans. Twins of the CHECK constraints on
// scans, scan_findings and scan_finding_triage in db-elise;
// change both together.
// -----
export const SCAN_STATE_VALUES = ["queued", "running", "succeeded", "failed", "stopped"] as const;
export const FINDING_STATUS_VALUES = ["confirmed", "needs_validation"] as const;
export const FINDING_SEVERITY_VALUES = ["critical", "high", "medium", "low", "informational"] as const;
// -----
// A finding in a scan is new there, or carried from an
// earlier scan after the agent re-checked it.
// -----
export const FINDING_ORIGIN_VALUES = ["new", "carried"] as const;
export const REPO_FINDING_STATE_VALUES = ["open", "fixed_by_code", "regressed"] as const;
export const FINDING_TRIAGE_STATUS_VALUES = ["open", "fixed", "false_positive", "accepted_risk"] as const;

// -----
// Which Anthropic key paid for a scan: the platform's, or the one
// the Account brought. Twin of the CHECK on scans.key_source.
// -----
export const SCAN_KEY_SOURCE_VALUES = ["platform", "account"] as const;

// -----
// Where a Scan that runs on a Runner has got to. queued: waiting for
// the Runner to claim it. claimed: the Runner is working. cancelled:
// the Scan ended (timed out or failed) before the Runner reported.
// Twin of the CHECK on scan_runner_jobs.state.
// -----
// -----
// Where a Runner login from the terminal has got to. pending: started,
// waiting for a member. approved: a member chose an Account and a name.
// denied: a member refused it. collected: the Runner took its token.
// Twin of the CHECK on platform_runner_device_logins.state.
// -----
export const RUNNER_LOGIN_STATE_VALUES = ["pending", "approved", "denied", "collected"] as const;

export const RUNNER_JOB_STATE_VALUES = ["queued", "claimed", "succeeded", "failed", "cancelled"] as const;

// -----
// Subscriptions. Twins of the CHECKs on tenant_subscriptions. status
// follows Stripe's own words. source says who made the row: a Stripe
// subscription, or a grant by the operator that Stripe does not know.
// -----
export const SUBSCRIPTION_STATUS_VALUES = ["active", "past_due", "canceled", "unpaid", "incomplete"] as const;
export const SUBSCRIPTION_SOURCE_VALUES = ["stripe", "grant"] as const;

// -----
// What a credit ledger entry is. grant and topup add credit; scan_hold
// takes what a running scan may spend; scan_settle gives back the hold
// and takes the real charge; expiry takes credit that lapsed; adjustment
// is the operator's correction, up or down.
// -----
export const CREDIT_ENTRY_KIND_VALUES = ["grant", "topup", "scan_hold", "scan_settle", "expiry", "adjustment"] as const;

export type ScanStateValue = (typeof SCAN_STATE_VALUES)[number];
export type FindingOriginValue = (typeof FINDING_ORIGIN_VALUES)[number];
export type RepoFindingStateValue = (typeof REPO_FINDING_STATE_VALUES)[number];
export type FindingStatusValue = (typeof FINDING_STATUS_VALUES)[number];
export type FindingSeverityValue = (typeof FINDING_SEVERITY_VALUES)[number];
export type FindingTriageStatusValue = (typeof FINDING_TRIAGE_STATUS_VALUES)[number];
export type ScanKeySourceValue = (typeof SCAN_KEY_SOURCE_VALUES)[number];
export type RunnerLoginStateValue = (typeof RUNNER_LOGIN_STATE_VALUES)[number];
export type RunnerJobStateValue = (typeof RUNNER_JOB_STATE_VALUES)[number];
export type SubscriptionStatusValue = (typeof SUBSCRIPTION_STATUS_VALUES)[number];
export type SubscriptionSourceValue = (typeof SUBSCRIPTION_SOURCE_VALUES)[number];
export type CreditEntryKindValue = (typeof CREDIT_ENTRY_KIND_VALUES)[number];

// -----
// Where a running scan is: cloning the repo, the agent
// auditing it, or saving its files.
// -----
export const SCAN_STEP_VALUES = ["cloning", "auditing", "saving"] as const;

// -----
// The four Phases of a full audit, in the order they run. The Runner
// job's phasePrompts carry them, and so does a Trace entry: twin of
// the CHECK on scan_trace_entries.phase.
// -----
export const RUNNER_JOB_PHASE_VALUES = ["recon", "hunt", "check", "report"] as const;

// -----
// What a Trace entry says the agent did. A closed set: the producer
// keeps the label and drops everything else the agent wrote. A tool
// it does not know is calling_tool. Twin of the CHECK on
// scan_trace_entries.label.
// -----
export const TRACE_LABEL_VALUES = ["reasoning", "reading_files", "searching", "running_command", "writing", "calling_tool", "phase_started", "phase_ended"] as const;

export type ScanStepValue = (typeof SCAN_STEP_VALUES)[number];
export type RunnerJobPhaseValue = (typeof RUNNER_JOB_PHASE_VALUES)[number];
export type TraceLabelValue = (typeof TRACE_LABEL_VALUES)[number];

// -----
// Where the code of a Scan comes from (docs/adr/0008-git-providers.md).
// A Repo is known by (provider, host, path); upload has no host. A
// request without a provider means github. Twin of the CHECK on
// scan_repos.provider.
// -----
export const SOURCE_PROVIDER_VALUES = ["github", "gitlab", "gitlab-sh", "upload"] as const;

export type SourceProviderValue = (typeof SOURCE_PROVIDER_VALUES)[number];

export const DEFAULT_SOURCE_PROVIDER = "github" satisfies SourceProviderValue;

// -----
// What a Runner job reads: a git clone, or an uploaded zip (an
// archive). Not a database enum: only the job carries it.
// -----
export const RUNNER_JOB_SOURCE_VALUES = ["git", "archive"] as const;

export type RunnerJobSourceValue = (typeof RUNNER_JOB_SOURCE_VALUES)[number];
