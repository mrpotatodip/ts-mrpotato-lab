// -----
// The repo a git path names, as owner/name in lowercase: the same
// form as canonicalRepo, so it can be compared with the repo of a Scan.
// -----
export const repoOfGitPath = (pathname: string): string => {
  const [owner = "", name = ""] = pathname.split("/").filter((part) => part !== "");
  return `${owner}/${name.replace(/\.git$/, "")}`.toLowerCase();
};

// -----
// What git sends for a token over HTTPS: any user name, the token as the password.
// -----
export const gitBasicAuth = (token: string): string => `Basic ${btoa(`x-access-token:${token}`)}`;
