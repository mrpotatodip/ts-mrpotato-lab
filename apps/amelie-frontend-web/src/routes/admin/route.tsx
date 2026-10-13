import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

import { adminQueries } from "#/modules/admin";
import { DashboardShell } from "#/modules/dashboard";
import { AppErrorComponent } from "#/modules/shared";

// -----
// Superusers only, in the same frame as the cafe screens
// (the sidebar shows the cafe's groups only if there is
// a cafe). Anyone else sees not found.
// -----
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });

    const { isSuperuser } = await context.queryClient.query(adminQueries.access());
    if (!isSuperuser) throw notFound();
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
