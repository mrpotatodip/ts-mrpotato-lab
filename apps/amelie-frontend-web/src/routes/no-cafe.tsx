import { createFileRoute, redirect } from "@tanstack/react-router";

import { adminQueries, resolveAdminLanding } from "#/modules/admin";
import { TenantNoCafe, tenantsQueries } from "#/modules/tenant";

// -----
// Outside the dashboard frame on purpose: it
// must never render anything that needs a cafe.
// -----
export const Route = createFileRoute("/no-cafe")({
  beforeLoad: async ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });

    const [{ tenants }, { isSuperuser }] = await Promise.all([
      context.queryClient.query(tenantsQueries.list()),
      context.queryClient.query(adminQueries.access()),
    ]);
    const landing = resolveAdminLanding({ isSuperuser, cafeCount: tenants.length });
    if (landing !== "/no-cafe") throw redirect({ to: landing });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <TenantNoCafe />;
}
