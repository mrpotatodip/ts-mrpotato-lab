export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";
export const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_USER_INSTALLATIONS_MAX_PAGES = 5;
export const GITHUB_BRANCHES_PER_PAGE = 100;
export const GITHUB_REPOS_PER_PAGE = 100;
export const GITHUB_INSTALLATION_REPOS_MAX_PAGES = 10;

// -----
// The App JWT. GitHub allows at most 10 minutes. iat starts
// a minute back so a slow clock does not make it "from the future".
// -----
export const GITHUB_APP_JWT_TTL_S = 540;
export const GITHUB_APP_JWT_SKEW_S = 60;
