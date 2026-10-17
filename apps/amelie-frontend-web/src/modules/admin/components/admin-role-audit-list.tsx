import { Suspense } from "react";
import { LocalDateTime } from "#/modules/shared";
import { useSuspenseAdminRoleAudit } from "../hooks";
import { describeAdminAuditEntry } from "../utils";
import { AdminRoleAuditSkeleton } from "./admin-role-audit-skeleton";

type AdminRoleAuditListProps = {
  roleId: string;
};

function AdminRoleAuditView({ roleId }: AdminRoleAuditListProps) {
  const { data } = useSuspenseAdminRoleAudit(roleId);

  if (data.length === 0) {
    return <p className="stat-label p-6">No changes recorded yet.</p>;
  }

  return (
    <ul className="divide-y">
      {data.map((entry) => {
        const { title, details } = describeAdminAuditEntry(entry);
        return (
          <li key={entry.id} className="flex flex-col gap-1 px-6 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{title}</p>
              <p className="stat-label">
                {entry.actorEmail ?? "Unknown"} · <LocalDateTime iso={entry.createdAt} />
              </p>
            </div>
            {details.length > 0 ? (
              <ul className="text-muted-foreground max-h-32 overflow-auto font-mono text-xs">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function AdminRoleAuditList({ roleId }: AdminRoleAuditListProps) {
  return (
    <Suspense fallback={<AdminRoleAuditSkeleton />}>
      <AdminRoleAuditView roleId={roleId} />
    </Suspense>
  );
}
