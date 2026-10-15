type DashboardAccountSubtitleInput = {
  role: "owner" | "manager" | "staff" | null;
  isSuperuser: boolean;
};

// -----
// Shown until billing exists: every cafe is on
// Free, so the footer can name the plan now.
// -----
export const DASHBOARD_PLAN_NAME = "Free";
export const DASHBOARD_PLAN_LABEL = "Free plan";

export function dashboardRoleLabel(role: DashboardAccountSubtitleInput["role"]): string | null {
  if (!role) return null;
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

export function dashboardAccountSubtitle({ role, isSuperuser }: DashboardAccountSubtitleInput): string {
  const roleLabel = dashboardRoleLabel(role);
  if (roleLabel) return `${roleLabel} · ${DASHBOARD_PLAN_LABEL}`;
  if (isSuperuser) return "Superuser";
  return DASHBOARD_PLAN_LABEL;
}

export function dashboardAccountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
