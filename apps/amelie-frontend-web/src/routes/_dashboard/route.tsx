import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { adminQueries, resolveAdminLanding } from "#/modules/admin";
import { DashboardShell, prefetchDashboardScope, prefetchFaqsPage } from "#/modules/dashboard";
import { AppErrorComponent } from "#/modules/shared";
import { tenantsQueries } from "#/modules/tenant";

// -----
// Signed-in only: the cafe's screens, inside the
// sidebar frame with the cafe picker. A login with
// no cafe goes to /admin (superuser) or /no-cafe.
// -----
export const Route = createFileRoute("/_dashboard")({
  beforeLoad: async ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });

    const [{ tenants }, { isSuperuser }] = await Promise.all([
      context.queryClient.query(tenantsQueries.list()),
      context.queryClient.query(adminQueries.access()),
    ]);
    const landing = resolveAdminLanding({ isSuperuser, cafeCount: tenants.length });
    if (landing !== "/overview") throw redirect({ to: landing });
  },
  loader: ({ context }) => {
    void prefetchFaqsPage(context.queryClient);
    return prefetchDashboardScope(context.queryClient);
  },
  component: RouteComponent,
  errorComponent: AppErrorComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();

  return (
    <DashboardShell userName={user?.name ?? ""}>
      <Outlet />
    </DashboardShell>
  );
}
