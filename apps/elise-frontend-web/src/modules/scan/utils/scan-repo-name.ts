const GITHUB_PREFIX = "https://github.com/";

export function scanRepoName(repo: string | null | undefined, fallback: string) {
  const path = repo?.replace(GITHUB_PREFIX, "").replace(/\.git$/, "").replace(/\/$/, "");
  if (!path) return { owner: "", name: fallback };
  const [owner = "", ...rest] = path.split("/");
  return { owner, name: rest.join("/") };
}
