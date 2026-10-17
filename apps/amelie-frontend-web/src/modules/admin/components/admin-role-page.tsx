import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageCard, PageHeader } from "#/modules/shared";
import { useAdminRoleActions, useSuspenseAdminRole } from "../hooks";
import { AdminRoleAuditList } from "./admin-role-audit-list";
import { AdminRoleDeleteCard } from "./admin-role-delete-card";
import { AdminRoleDetailsForm } from "./admin-role-details-form";
import { AdminRolePowerChecklist } from "./admin-role-power-checklist";
import { AdminRoleSkeleton } from "./admin-role-skeleton";
import { AdminRoleStatusCard } from "./admin-role-status-card";

type AdminRolePageProps = {
  roleId: string;
};

const BACK_LINK = (
  <Link to="/admin/roles" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm">
    <ArrowLeft className="size-4" />
    All roles
  </Link>
);

function AdminRoleView({ roleId }: AdminRolePageProps) {
  const { data: role } = useSuspenseAdminRole(roleId);
  const { setPowers } = useAdminRoleActions();

  return (
    <>
      {BACK_LINK}
      <PageHeader title={role.label} description={role.description ?? `Key: ${role.key}`} />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <div className="flex flex-col gap-8">
          <PageCard title="Details">
            <AdminRoleDetailsForm key={`${role.label}|${role.description ?? ""}`} role={role} />
          </PageCard>
          <PageCard title="Status" description="Whether cafes can give this role to their team.">
            <AdminRoleStatusCard role={role} />
          </PageCard>
          <PageCard title="Delete">
            <AdminRoleDeleteCard role={role} />
          </PageCard>
        </div>
        <div className="flex flex-col gap-8">
          <PageCard title="Powers" description="What someone with this role can do, in every cafe.">
            <AdminRolePowerChecklist
              key={role.powers.join(",")}
              role={role}
              saving={{
                isPending: setPowers.isPending,
                errorMessage: setPowers.error?.message ?? null,
                save: (powers, onSaved) => setPowers.mutate({ roleId: role.id, powers }, { onSuccess: onSaved }),
              }}
            />
          </PageCard>
          <PageCard title="History" description="Every change to this role, newest first." contentClassName="p-0">
            <AdminRoleAuditList roleId={role.id} />
          </PageCard>
        </div>
      </div>
    </>
  );
}

export function AdminRolePage({ roleId }: AdminRolePageProps) {
  return (
    <Suspense
      fallback={
        <>
          {BACK_LINK}
          <PageHeader title="Role" description="Loading..." />
          <AdminRoleSkeleton />
        </>
      }
    >
      <AdminRoleView roleId={roleId} />
    </Suspense>
  );
}
