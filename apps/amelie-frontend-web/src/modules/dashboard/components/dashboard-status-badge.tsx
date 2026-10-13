import type { ReactNode } from "react";

import type { DashboardStatusTone } from "../types";

type DashboardStatusBadgeProps = {
  tone: DashboardStatusTone;
  children: ReactNode;
};

// -----
// A soft pill whose colour says the state at a glance:
// green done, amber needs you, blue working, red failed.
// -----
export function DashboardStatusBadge({ tone, children }: DashboardStatusBadgeProps) {
  return (
    <span className="status-badge" data-status={tone}>
      {children}
    </span>
  );
}
