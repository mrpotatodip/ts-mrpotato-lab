import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScanNewDialog, scansQuery, scanSidebarItems } from "#/modules/scan";
import { TENANT_ADMIN_ROLE_KEY } from "#/modules/team";
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
  const onRepoPage = useRouterState({ select: (state) => state.location.pathname.startsWith("/repos/") });

  return (
    <ShellFrame
      accountName={user?.accountName ?? ""}
      userName={user?.name ?? ""}
      email={user?.email ?? ""}
      scanCount={total}
      running={running}
      repos={repos}
      repoCount={repoCount}
      mode="live"
      showTeam={user?.role === TENANT_ADMIN_ROLE_KEY}
      actions={<ScanNewDialog variant={onRepoPage ? "outline" : "default"} />}
    >
      <Outlet />
    </ShellFrame>
  );
}
