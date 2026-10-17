import type { AdminRole } from "@repo/contracts/amelie";
import { adminRoleStatusLabel, adminRoleStatusTone } from "../utils";

export function AdminRoleStatusBadge({ role }: { role: Pick<AdminRole, "scope" | "enabled"> }) {
  return (
    <span className="status-badge" data-status={adminRoleStatusTone(role)}>
      {adminRoleStatusLabel(role)}
    </span>
  );
}
