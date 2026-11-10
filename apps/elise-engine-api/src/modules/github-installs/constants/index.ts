export const GITHUB_INSTALL_STATE_TTL_MS = 10 * 60 * 1000;
export const GITHUB_INSTALL_STATE_PURPOSE = "elise-github-install";
export const GITHUB_REPOS_CONCURRENCY = 3;

export const GITHUB_NOT_SET_UP = "GitHub is not set up on this server";
export const GITHUB_STATE_REFUSED = "This GitHub install link has expired or was not made for you. Start again";
export const GITHUB_CODE_REFUSED = "GitHub did not accept the install code. Start again";
export const GITHUB_INSTALL_NOT_YOURS = "You cannot use that GitHub install";
export const GITHUB_INSTALL_UNKNOWN = "GitHub has no such install";
export const GITHUB_INSTALL_NOT_FOUND = "GitHub install not found";
export const GITHUB_REPO_NOT_VISIBLE = "This connection cannot see that repository";
export const GITHUB_CHECK_STALE_MS = 5 * 60 * 1000;
export const GITHUB_INSTALL_TAKEN = "This GitHub install is already connected to another account";
export const GITHUB_INSTALL_CONSTRAINT = "uq_tenant_github_installations_install";
