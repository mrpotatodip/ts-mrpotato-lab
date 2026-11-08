const GITHUB_PREFIX = /^https:\/\/github\.com\//;
const GIT_SUFFIX = /(\.git)?\/?$/;

// -----
// The same repo, however it was typed: owner/name
// in lowercase, without the host, .git or a trailing
// slash. Twin of the SQL in migration 0058_scan_repos.
// -----
export const canonicalRepo = (url: string): string => url.replace(GITHUB_PREFIX, "").replace(GIT_SUFFIX, "").toLowerCase();

// -----
// The URL as first typed, minus .git and a trailing
// slash. It is what the repo record keeps for display.
// -----
export const displayRepoUrl = (url: string): string => url.replace(GIT_SUFFIX, "");
