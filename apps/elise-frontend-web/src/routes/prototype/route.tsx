import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { ScanNewDialog, scansQuery, scanSidebarItems } from "#/modules/scan";
import { ScanPrototypeProvider } from "#/modules/scan/prototypes";
import { ShellFrame } from "#/modules/shell";

export const Route = createFileRoute("/prototype")({
  beforeLoad: ({ context }) => {
    if (!import.meta.env.DEV) throw notFound();
    if (!context.user) throw redirect({ to: "/signin" });
  },
  component: PrototypeLayout,
});

function PrototypeFrame() {
  const { user } = Route.useRouteContext();
  const { data } = useQuery(scansQuery());
  const { repos, repoCount, running, total } = scanSidebarItems(data?.scans ?? []);

  return (
    <ShellFrame accountName={user?.accountName ?? ""} email={user?.email ?? ""} scanCount={total} running={running} repos={repos} repoCount={repoCount} mode="demo" actions={<ScanNewDialog />}>
      <Alert>
        <FlaskConical />
        <AlertDescription>Demo data. Nothing on these screens is real, and nothing here is saved or sent to the engine.</AlertDescription>
      </Alert>
      <Outlet />
    </ShellFrame>
  );
}

function PrototypeLayout() {
  return (
    <ScanPrototypeProvider>
      <PrototypeFrame />
    </ScanPrototypeProvider>
  );
}
