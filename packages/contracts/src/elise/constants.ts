export const PUBLIC_CHAT_MESSAGE_MAX_LENGTH = 500;

// -----
// Sign-up: limits the form and the server share
// -----
export const SIGN_UP_INVITE_CODE_MAX = 128;
export const SIGN_UP_PERSON_NAME_MAX = 60;
export const SIGN_UP_ACCOUNT_NAME_MAX = 80;
export const SIGN_UP_EMAIL_MAX = 254;
export const SIGN_UP_PASSWORD_MIN = 8;
export const SIGN_UP_PASSWORD_MAX = 128;

// -----
// Invite codes: limits the admin form and the server share
// -----
export const INVITE_CODE_NOTE_MAX = 200;
export const INVITE_CODE_MAX_USES_DEFAULT = 1;
export const INVITE_CODE_MAX_USES_LIMIT = 1000;

export const TEAM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TEAM_INVITE_TOKEN_BYTES = 32;

// -----
// Runners: a pairing code works once, for 10 minutes. The
// token a paired Runner keeps is 32 random bytes.
// -----
export const RUNNER_NAME_MAX = 60;
export const RUNNER_PAIRING_CODE_MAX = 32;
export const RUNNER_PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
export const RUNNER_TOKEN_BYTES = 32;

// -----
// A Scan on a Runner: how long it may wait for the app to claim it,
// and the most a report may carry (characters), so one Runner cannot
// fill the database.
// -----
export const RUNNER_JOB_QUEUE_TIMEOUT_MS = 10 * 60 * 1000;
export const RUNNER_JOB_ERROR_MAX = 4000;
export const RUNNER_JOB_LOG_MAX = 200_000;
export const RUNNER_JOB_FILE_MAX = 2_000_000;

// -----
// Groups and team invites: caps the form and the
// server share, so one Tenant cannot grow without
// bound
// -----
export const GROUP_NAME_MAX = 60;
export const GROUP_LIMIT_PER_TENANT = 100;
export const GROUP_MEMBER_LIMIT = 500;
export const TEAM_PENDING_INVITE_LIMIT = 200;
export const TEAM_INVITE_GROUP_LIMIT = 20;

// -----
// Verdict: an accepted risk lasts at most this many days;
// a pass needs this many succeeded lite scans of the commit
// -----
export const ACCEPTED_RISK_MAX_DAYS = 90;
export const VERDICT_MIN_SCANS = 2;

// -----
// Repos and branches: caps per Account and per Repo
// -----
export const REPO_LIMIT_PER_TENANT = 200;
export const REPO_BRANCH_LIMIT = 25;
