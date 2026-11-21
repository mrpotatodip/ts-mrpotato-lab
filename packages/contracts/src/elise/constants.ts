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
// A Runner login from the terminal: both codes work once, for
// 10 minutes. The device code is 32 random bytes only the Runner
// sees. The suggested fields are capped so one start cannot fill
// the table.
// -----
export const RUNNER_LOGIN_TTL_MS = 10 * 60 * 1000;
export const RUNNER_LOGIN_DEVICE_CODE_BYTES = 32;
export const RUNNER_LOGIN_USER_CODE_MAX = 32;
export const RUNNER_LOGIN_DEVICE_CODE_MAX = 128;
export const RUNNER_LOGIN_FIELD_MAX = 120;

// -----
// How often the Runner may check a login, in seconds. A check
// sooner than that is answered "slow_down", and each one adds the
// step to the interval the Runner must keep (RFC 8628).
// -----
export const RUNNER_LOGIN_CHECK_INTERVAL_S = 5;
export const RUNNER_LOGIN_SLOW_DOWN_STEP_S = 5;

// -----
// A Scan on a Runner: how long it may wait for the app to claim it,
// and the most a report may carry (characters), so one Runner cannot
// fill the database.
// -----
export const RUNNER_JOB_QUEUE_TIMEOUT_MS = 10 * 60 * 1000;
export const RUNNER_JOB_ERROR_MAX = 4000;
export const RUNNER_JOB_LOG_MAX = 200_000;
export const RUNNER_JOB_FILE_MAX = 2_000_000;
export const RUNNER_JOB_SOURCES_MAX = 10;
export const RUNNER_JOB_SOURCE_NAME_MAX = 40;

// -----
// A Scan's Trace: the most entries one Scan keeps (a sanity cap, so a
// runaway producer cannot fill the table) and the most one batch may
// carry. A producer sends a batch every few seconds, far below both.
// -----
export const TRACE_ENTRIES_PER_SCAN_MAX = 5000;
export const TRACE_BATCH_MAX = 500;

// -----
// A running Scan's live Findings: the most records one Scan keeps
// before its result (a sanity cap) and the most one batch may carry.
// -----
export const LIVE_FINDINGS_PER_SCAN_MAX = 1000;
export const LIVE_FINDINGS_BATCH_MAX = 200;

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
// a pass needs succeeded scans of the commit whose weights
// add up to VERDICT_MIN_SCANS. A scan weighs what its Skill
// and profile say: every profile and an old lite scan count
// one, so one scan gives a Verdict. Provisional until real
// scans are measured.
// -----
export const ACCEPTED_RISK_MAX_DAYS = 90;
export const VERDICT_MIN_SCANS = 1;
export const VERDICT_SCAN_WEIGHTS = { quick: 1, standard: 1, deep: 1, lite: 1 } as const;

// -----
// Finding comments: the longest body, and how many events
// of a thread one answer holds
// -----
export const FINDING_COMMENT_BODY_MAX = 4000;
export const FINDING_THREAD_EVENT_LIMIT = 200;

// -----
// Repos and branches: caps per Account and per Repo
// -----
export const REPO_LIMIT_PER_TENANT = 200;
export const REPO_BRANCH_LIMIT = 25;

// -----
// Upload apps: the label a zip is listed under (the file name
// the dashboard sends), and the limits of
// docs/adr/0008-git-providers.md. The upload route checks all
// of them against the zip's central directory; the Runner checks
// the unpacked ones again while it unpacks. A zip no Scan has
// read is deleted UPLOAD_ARCHIVE_RETENTION_DAYS after upload.
// -----
export const UPLOAD_ARCHIVE_LABEL_MAX = 120;
export const UPLOAD_ARCHIVE_MAX_MB = 50;
export const UPLOAD_UNPACKED_MAX_MB = 250;
export const UPLOAD_FILES_MAX = 20_000;
export const UPLOAD_PATH_DEPTH_MAX = 20;
export const UPLOAD_ARCHIVES_PER_APP_MAX = 20;
export const UPLOAD_STORAGE_PER_TENANT_MAX_MB = 500;
export const UPLOAD_ARCHIVE_RETENTION_DAYS = 30;

// -----
// Each refusal names its limit, so the person knows what to fix.
// The dashboard says the same before it sends a zip.
// -----
export const UPLOAD_NOT_A_ZIP_MESSAGE = "The file is not a zip";
export const UPLOAD_ARCHIVE_TOO_LARGE_MESSAGE = `A zip can be at most ${UPLOAD_ARCHIVE_MAX_MB} MB`;
export const UPLOAD_UNPACKED_TOO_LARGE_MESSAGE = `A zip can unpack to at most ${UPLOAD_UNPACKED_MAX_MB} MB`;
export const UPLOAD_TOO_MANY_FILES_MESSAGE = `A zip can hold at most ${UPLOAD_FILES_MAX.toLocaleString("en-US")} files`;
export const UPLOAD_PATH_TOO_DEEP_MESSAGE = `A path in a zip can be at most ${UPLOAD_PATH_DEPTH_MAX} levels deep`;
export const UPLOAD_TOO_MANY_ARCHIVES_MESSAGE = `An upload app can hold at most ${UPLOAD_ARCHIVES_PER_APP_MAX} zips: remove one first`;
export const UPLOAD_STORAGE_FULL_MESSAGE = `An account can store at most ${UPLOAD_STORAGE_PER_TENANT_MAX_MB} MB of zips: remove some first`;

// -----
// An upload app's name: a letter or digit first, then letters,
// digits, spaces, dots, dashes and underscores, ending in no
// space; at most 80 characters. No slash, so a name never reads
// as a path. Unique in an Account however it is cased.
// -----
export const UPLOAD_APP_NAME_PATTERN = /^[A-Za-z0-9](?:[\w .-]{0,78}[\w.-])?$/;
export const UPLOAD_APP_NAME_MESSAGE = "An app name is letters, digits, spaces, '.', '-' and '_', starts with a letter or digit, has no slash and is at most 80 characters";

// -----
// GitLab addresses (docs/adr/0008-git-providers.md). A path is
// groups inside groups and a name: 2 to 20 parts, each letters,
// digits, '.', '_' or '-' and starting with a letter, digit or
// '_', as GitLab requires (so no '..'). It is read up to a
// branch-view marker ('/-/', as in '/-/tree/main') or a
// trailing '.git'. https only, and a plain host: no user,
// password or port. A gitlab-sh host is never github.com or
// gitlab.com, which have providers of their own. Group 1 is
// the host, group 2 the path. Twin of the Runner's
// core/src/providers/address.rs.
// -----
export const GITLAB_ADDRESS_MESSAGE = "A GitLab address looks like https://gitlab.com/group/name (groups inside groups are fine)";
export const GITLAB_SH_ADDRESS_MESSAGE = "A GitLab server address looks like https://git.example.com/group/name, on a host other than github.com or gitlab.com";
export const GITLAB_ADDRESS_PATTERN = /^https:\/\/(gitlab\.com)\/((?:[a-z0-9_][\w.-]*\/){1,19}[a-z0-9_][\w.-]*?)(?:\.git)?\/?(?:\/-\/.*)?$/i;
export const GITLAB_SH_ADDRESS_PATTERN =
  /^https:\/\/(?!(?:github|gitlab)\.com\/)((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\/((?:[a-z0-9_][\w.-]*\/){1,19}[a-z0-9_][\w.-]*?)(?:\.git)?\/?(?:\/-\/.*)?$/i;
