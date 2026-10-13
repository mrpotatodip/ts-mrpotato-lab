import type { DashboardStatusTone } from "../types";

export type DashboardImportInput = {
  status: "running" | "ready" | "failed";
  pendingCount: number;
  error?: string | null;
};

export type DashboardImportNotice = {
  tone: DashboardStatusTone;
  badge: string;
  detail: string;
};

// -----
// What the owner is told about their latest menu import,
// or undefined when it needs nothing. "ready" with drafts
// left is amber: the owner has to review them.
// -----
export function describeImport(latest: DashboardImportInput | undefined): DashboardImportNotice | undefined {
  if (!latest) return undefined;
  if (latest.status === "running") return { tone: "info", badge: "Running", detail: "Reading your files…" };
  if (latest.status === "failed") {
    return { tone: "danger", badge: "Failed", detail: latest.error ?? "The import failed." };
  }
  if (latest.pendingCount === 0) return undefined;
  return { tone: "warning", badge: "Review", detail: `${latest.pendingCount} to review` };
}
