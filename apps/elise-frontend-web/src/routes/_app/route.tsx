import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScanNewDialog, scansQuery, scanSidebarItems } from "#/modules/scan";
import { hasAccessPower, isWatcher } from "@repo/contracts/elise";
import { ShellFrame } from "#/modules/shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: "/signin" });
    if (isWatcher(context.user.powers) && !location.pathname.startsWith("/summary")) throw redirect({ to: "/summary" });
  },
  loader: ({ context }) => (isWatcher(context.user?.powers ?? []) ? null : context.queryClient.query({ ...scansQuery(), staleTime: "static" })),
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  const showDashboard = !isWatcher(user?.powers ?? []);
  const { data } = useQuery({ ...scansQuery(), enabled: showDashboard });
  const { repos, repoCount, running, total } = scanSidebarItems(data?.scans ?? []);
  const pageHasOwnScanButton = useRouterState({ select: (state) => state.location.pathname.startsWith("/repos/") || state.location.pathname.startsWith("/scans/") });

  return (
    <ShellFrame
      accountName={user?.accountName ?? ""}
      userName={user?.name ?? ""}
      email={user?.email ?? ""}
      scanCount={total}
      running={running}
      repos={repos}
      repoCount={repoCount}
      showTeam={hasAccessPower(user?.powers ?? [], "company:team:members:read")}
      showSettings={hasAccessPower(user?.powers ?? [], "company:usage:budget:update")}
      showDashboard={showDashboard}
      actions={showDashboard ? <ScanNewDialog variant={pageHasOwnScanButton ? "outline" : "default"} /> : undefined}
    >
      <Outlet />
    </ShellFrame>
  );
}
