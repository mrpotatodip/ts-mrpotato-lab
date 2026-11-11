// -----
// The App's two Secrets. The key is PKCS#8 PEM: GitHub hands out
// PKCS#1, so convert it once with
// `openssl pkcs8 -topk8 -nocrypt -in app.pem`.
// -----
export type GithubAppConfig = { appId: string; privateKey: string };

export type GithubFetch = typeof fetch;

export type GithubRepoInfo = { repoId: number; isPrivate: boolean };

// -----
// The App's OAuth pair, used once per install to learn which person
// finished it. Not the key above: that one proves the App to GitHub.
// -----
export type GithubOAuthConfig = { clientId: string; clientSecret: string };

export type GithubInstallationInfo = { accountLogin: string; repositorySelection: "all" | "selected"; htmlUrl: string; suspended: boolean };

export type GithubListedRepo = { fullName: string; url: string; isPrivate: boolean };

export type GithubRepoBranches = { defaultBranch: string; branches: string[]; truncated: boolean };
