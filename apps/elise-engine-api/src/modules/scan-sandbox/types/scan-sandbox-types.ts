// -----
// Agent
// -----
export type AgentState = { state: "running" } | { state: "succeeded" } | { state: "failed"; error: string };
export type OutboundExport = (options: { props?: never }) => Fetcher;
export type OutboundTarget = "anthropic" | "github" | null;
