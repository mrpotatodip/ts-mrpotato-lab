import type { ScanUsage } from "@repo/contracts/elise";
import type { ScanFiles } from "#/lib/scan-file-types";
import type { ScanOptions, ScanParams, ScanState } from "#/schemas";
import type { ScanRepo } from "#/modules/scan-ledger";
import type { PriorFinding } from "#/modules/scan-records";
import type { AgentState, FullPhase, OutboundAnthropicKey, OutboundGithub, PhaseEnd, ScanCheckout } from "#/modules/scan-sandbox";

// -----
// The sandbox as the Workflow uses it. Its Durable Object
// stub fits, and a test can stand in a fake.
// -----
export type SandboxPort = {
  prepare: (repoUrl: string, ref?: string, github?: OutboundGithub, anthropicKey?: OutboundAnthropicKey) => Promise<ScanCheckout>;
  launchAgent: (options: ScanOptions, priors: PriorFinding[]) => Promise<void>;
  // -----
  // The two calls of a full Scan's Phases. A Phase is one run of the agent
  // with its own slice of the cap; pollAgent then answers for the run that
  // is going. Neither is optional, for the reason given at readCheckout.
  // -----
  launchPhase: (options: ScanOptions, phase: FullPhase) => Promise<void>;
  endPhase: (phase: FullPhase) => Promise<PhaseEnd>;
  pollAgent: () => Promise<AgentState>;
  agentLogTail: () => Promise<string>;
  readUsage: () => Promise<ScanUsage | null>;
  readFiles: () => Promise<ScanFiles>;
  // -----
  // Only a sandbox that learns the commit after the agent ends has
  // an answer (a Runner clones on its own computer); the cloud
  // Sandbox returns null, because `prepare` already gave it. It is
  // not optional: a Durable Object stub accepts any method name,
  // so a missing one fails at run time, after the agent was paid.
  // -----
  readCheckout: () => Promise<ScanCheckout | null>;
  destroy: () => Promise<void>;
};

// -----
// Everything a run touches outside itself: the sandbox, the
// ledger, the bucket, and the two reads and one write that
// reach the database.
// -----
export type ScanRunDeps = {
  sandbox: SandboxPort;
  maxPolls: number;
  phases?: readonly FullPhase[];
  ledger: ScanRepo;
  reports: R2Bucket;
  readPriors: (params: ScanParams) => Promise<PriorFinding[]>;
  sealedKeyFor: (accountId: string) => Promise<string | null>;
  recordScan: (params: ScanParams, status: ScanState, error: string | null, usage: ScanUsage | null) => Promise<void>;
  settleCredit: (params: ScanParams, status: "succeeded" | "failed", usage: ScanUsage | null) => Promise<void>;
};

export type PollResult = { state: "running" | "succeeded" | "failed"; error?: string };
