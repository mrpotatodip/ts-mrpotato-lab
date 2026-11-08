// -----
// Input
// -----
export const SCANS_GITHUB_REPO = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/;
// -----
// A ref reaches git as an argument, so it cannot start
// with a dash, and it holds only what a branch, tag or
// commit name needs.
// -----
export const SCANS_GIT_REF = /^[\w][\w./-]{0,99}$/;
export const SCANS_SCAN_ID_PATTERN = /^[\w-]{1,100}$/;

// -----
// Listing and limits
// -----
export const SCANS_PAGE_SIZE = 50;
export const SCANS_ACTIVE_WINDOW_MS = 90 * 60 * 1000;
