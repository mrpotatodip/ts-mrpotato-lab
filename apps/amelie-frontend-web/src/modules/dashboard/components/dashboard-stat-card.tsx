import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import type { DashboardRoute } from "../types";

type DashboardStatCardProps = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  to: DashboardRoute;
};

// -----
// One number the owner cares about, with a line that says
// what it means. The whole card links to the screen behind it.
// -----
export function DashboardStatCard({ label, value, hint, icon: Icon, to }: DashboardStatCardProps) {
  return (
    <Link to={to} className="dashboard-card hover:bg-accent/40 flex flex-col gap-3 rounded-3xl p-6 transition-colors">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">
          <Icon className="size-4" />
        </span>
      </div>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{hint}</span>
    </Link>
  );
}
