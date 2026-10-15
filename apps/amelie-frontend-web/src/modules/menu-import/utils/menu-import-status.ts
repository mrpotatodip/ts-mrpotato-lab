import type { DashboardStatusTone } from "#/modules/dashboard/types";
import { STATUS_LABEL } from "../constants";

type ImportListStatusInput = {
  status: "running" | "ready" | "failed";
  publishedAt: string | null;
  pendingCount: number;
};

export type ImportListStatus = {
  tone: DashboardStatusTone;
  label: string;
};

// -----
// Soft pills on the uploads list: blue while reading,
// amber when drafts still need a look, red if it failed,
// green once published.
// -----
export function importListStatus(item: ImportListStatusInput): ImportListStatus {
  if (item.status === "running") return { tone: "info", label: STATUS_LABEL.running };
  if (item.status === "failed") return { tone: "danger", label: STATUS_LABEL.failed };
  if (item.publishedAt) return { tone: "success", label: "Published" };
  if (item.pendingCount > 0) return { tone: "warning", label: STATUS_LABEL.ready };
  return { tone: "neutral", label: "Reviewed" };
}
