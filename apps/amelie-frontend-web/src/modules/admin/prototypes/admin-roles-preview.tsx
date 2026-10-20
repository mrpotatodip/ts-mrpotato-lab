import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ACCESS_ROLE_GRANTS, type AdminAuditEntry, type AdminRoleDetail } from "@repo/contracts/amelie";
import { adminQueries } from "../hooks";
import { AdminRolePage, AdminRolesLanding } from "../components";
import { DashboardShell } from "#/modules/dashboard";
import { countriesQueries } from "#/modules/country";
import { locationsQueries } from "#/modules/location";
import { tenantsQueries } from "#/modules/tenant";
import { PageHeader } from "#/modules/shared";

const base = { description: null, scope: "tenant", enabled: true, isSystem: false, canBeBound: false } as const;
const ROLES: AdminRoleDetail[] = [
  { ...base, id: "00000000-0000-4000-8000-000000000001", key: "tenant_admin", label: "Tenant admin", isSystem: true, canBeBound: false, powers: [...ACCESS_ROLE_GRANTS.tenant_admin], powerCount: ACCESS_ROLE_GRANTS.tenant_admin.length, holderCount: 1 },
  { ...base, id: "00000000-0000-4000-8000-000000000002", key: "store_admin", label: "Store admin", canBeBound: true, powers: [...ACCESS_ROLE_GRANTS.store_admin], powerCount: ACCESS_ROLE_GRANTS.store_admin.length, holderCount: 3 },
  { ...base, id: "00000000-0000-4000-8000-000000000003", key: "store_staff", label: "Store staff", canBeBound: true, powers: [...ACCESS_ROLE_GRANTS.store_staff], powerCount: ACCESS_ROLE_GRANTS.store_staff.length, holderCount: 12 },
  { ...base, id: "00000000-0000-4000-8000-000000000004", key: "shift_lead", label: "Shift lead", description: "Runs a shift and marks items sold out.", enabled: false, powers: ["company:menu:items:read", "store:menu:availability:read", "store:menu:availability:update"], powerCount: 3, holderCount: 0 },
  { ...base, id: "00000000-0000-4000-8000-000000000005", key: "superuser", label: "Superuser", scope: "platform", isSystem: true, canBeBound: false, powers: [...ACCESS_ROLE_GRANTS.superuser], powerCount: 3, holderCount: 1 },
];

const AUDIT: AdminAuditEntry[] = [
  { id: "10000000-0000-4000-8000-000000000001", actorEmail: "boss@amelie.test", action: "role.powers_set", subjectId: ROLES[3].id, before: { powers: ["company:menu:items:read"] }, after: { powers: ROLES[3].powers }, createdAt: "2026-10-17T02:00:00.000Z" },
  { id: "10000000-0000-4000-8000-000000000002", actorEmail: "boss@amelie.test", action: "role.updated", subjectId: ROLES[3].id, before: { key: "shift_lead", label: "Shift lead", description: null, enabled: false }, after: { key: "shift_lead", label: "Shift lead", description: "Runs a shift and marks items sold out.", enabled: false }, createdAt: "2026-10-17T01:00:00.000Z" },
  { id: "10000000-0000-4000-8000-000000000003", actorEmail: "boss@amelie.test", action: "role.created", subjectId: ROLES[3].id, before: null, after: { key: "shift_lead", label: "Shift lead", description: null, enabled: false }, createdAt: "2026-10-17T00:00:00.000Z" },
];

function seededClient() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY, retry: false } } });
  client.setQueryData(adminQueries.access().queryKey, { isSuperuser: true });
  client.setQueryData(adminQueries.roles().queryKey, ROLES.map(({ powers: _powers, ...role }) => role));
  for (const role of ROLES) {
    client.setQueryData(adminQueries.role(role.id).queryKey, role);
    client.setQueryData(adminQueries.roleAudit(role.id).queryKey, role.id === ROLES[3].id ? AUDIT : []);
  }
  client.setQueryData(tenantsQueries.list().queryKey, { tenants: [], activeTenantId: "" });
  client.setQueryData(countriesQueries.list().queryKey, []);
  client.setQueryData(locationsQueries.list().queryKey, []);
  return client;
}

type AdminRolesPreviewProps = {
  view: string;
};

export function AdminRolesPreview({ view }: AdminRolesPreviewProps) {
  const [client] = useState(seededClient);
  const roleId = ROLES.find((role) => role.key === view)?.id;
  return (
    <QueryClientProvider client={client}>
      <DashboardShell userName="Jay Cantones" userEmail="boss@amelie.test">
        {roleId ? (
          <AdminRolePage roleId={roleId} />
        ) : (
          <>
            <PageHeader title="Roles" description="The user types every cafe can give its team. Set up a role here, then enable it." />
            <AdminRolesLanding />
          </>
        )}
      </DashboardShell>
    </QueryClientProvider>
  );
}
