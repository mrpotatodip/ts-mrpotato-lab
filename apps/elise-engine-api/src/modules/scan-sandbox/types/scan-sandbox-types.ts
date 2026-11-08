// -----
// Agent
// -----
export type AgentState = { state: "running" } | { state: "succeeded" } | { state: "failed"; error: string };
export type OutboundExport = (options: { props?: never }) => Fetcher;
export type OutboundTarget = "anthropic" | "github" | null;

// -----
// What a clone read: the commit, and the branch when there is
// one to name (git's own answer for a plain clone, the ref for
// a branch scan, nothing for a tag, a commit or a detached HEAD).
// -----
export type ScanCheckout = { commitSha: string | null; branch: string | null };
