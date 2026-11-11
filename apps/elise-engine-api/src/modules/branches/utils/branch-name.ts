// -----
// One spelling per branch: "refs/heads/main" and " main " are
// "main". The case stays, because git treats Main and main as
// two branches. HEAD points at a branch, it is not one, so it
// has no name.
// -----
export const normalizeBranchName = (input: string): string | null => {
  const name = input.trim().replace(/^refs\/heads\//, "");
  return name === "" || name === "HEAD" ? null : name;
};

// -----
// A full commit id (40 hex digits) names a commit. A scan takes it
// as a ref, but it can never be a branch to track.
// -----
export const isCommitId = (name: string): boolean => /^[0-9a-fA-F]{40}$/.test(name);
