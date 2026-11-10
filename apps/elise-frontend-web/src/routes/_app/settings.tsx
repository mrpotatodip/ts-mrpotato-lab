import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasAccessPower } from "@repo/contracts/elise";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · EliseLAB" }] }),
  beforeLoad: ({ context }) => {
    if (!hasAccessPower(context.user?.powers ?? [], "company:usage:budget:update")) throw redirect({ to: "/overview" });
  },
  component: Outlet,
});
