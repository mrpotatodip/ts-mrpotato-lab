// -----
// Agent
// -----
export type AgentState = { state: "running" } | { state: "succeeded" } | { state: "failed"; error: string };
export type OutboundExport = (options: { props: OutboundProps }) => Fetcher;
export type OutboundTarget = "anthropic" | "github" | null;

// -----
// What a clone read: the commit, and the branch when there is
// one to name (git's own answer for a plain clone, the ref for
// a branch scan, nothing for a tag, a commit or a detached HEAD).
// -----
export type ScanCheckout = { commitSha: string | null; branch: string | null };

// -----
// What the Outbound proxy counts for one scan
// -----
export type MeteredTokens = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
export type Meter = MeteredTokens & { budgetUsd: number; spentUsd: number };
// -----
// A private repo the Outbound handler signs for: the install and the
// repo it may mint a token for, and repo as owner/name in lowercase.
// Absent for a public clone. It holds IDs, never a token.
// -----
export type OutboundGithub = { installationId: number; repoId: number; repo: string };
// -----
// The Anthropic key an account brought, still sealed (encrypted):
// Outbound opens it at the moment of a model call. Absent for an
// account on the platform key.
// -----
export type OutboundAnthropicKey = { accountId: string; sealed: string };
export type OutboundProps = { sandboxId: string; github?: OutboundGithub; anthropicKey?: OutboundAnthropicKey };
