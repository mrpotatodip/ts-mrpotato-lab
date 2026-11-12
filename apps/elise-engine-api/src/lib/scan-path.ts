import type { ScanOptions } from "#/schemas";
import type { Bindings } from "#/types/variables";

// -----
// A Scan runs on one of two paths inside this Worker, chosen by its
// Skill: lite on the original Workflow and Sandbox, full on its own
// Workflow, Sandbox class and Image. A long full Scan then never
// holds a place a lite Scan needs. Decisions: ADR 0006.
// -----
export type ScanPath = "lite" | "full";

export const scanPathOf = (skill: ScanOptions["skill"]): ScanPath => (skill === "full" ? "full" : "lite");

export const workflowOf = (env: Pick<Bindings, "SCAN_WORKFLOW" | "SCAN_WORKFLOW_FULL">, path: ScanPath): Bindings["SCAN_WORKFLOW"] =>
  path === "full" ? env.SCAN_WORKFLOW_FULL : env.SCAN_WORKFLOW;

export const sandboxesOf = (env: Pick<Bindings, "SANDBOX" | "SANDBOX_FULL">, path: ScanPath): Bindings["SANDBOX"] =>
  path === "full" ? env.SANDBOX_FULL : env.SANDBOX;

export const otherPathOf = (path: ScanPath): ScanPath => (path === "full" ? "lite" : "full");
