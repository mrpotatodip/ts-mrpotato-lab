import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScanNewDialog, scansQuery, scanSidebarItems } from "#/modules/scan";
import { hasAccessPower } from "@repo/contracts/elise";
import { ShellFrame } from "#/modules/shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  loader: ({ context }) => context.queryClient.query({ ...scansQuery(), staleTime: "static" }),
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  const { data } = useQuery(scansQuery());
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
      actions={<ScanNewDialog variant={pageHasOwnScanButton ? "outline" : "default"} />}
    >
      <Outlet />
    </ShellFrame>
  );
}
