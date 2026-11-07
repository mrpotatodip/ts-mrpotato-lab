import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { AuthSignOutButton } from "#/modules/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  component: ScansLayout,
});

function ScansLayout() {
  const { user } = Route.useRouteContext();
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/overview" className="font-semibold">
              Elise
            </Link>
            <Link to="/overview" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              Overview
            </Link>
            <Link to="/scans" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              Scans
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user?.accountName} · {user?.email}
            </span>
            <AuthSignOutButton />
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
}
