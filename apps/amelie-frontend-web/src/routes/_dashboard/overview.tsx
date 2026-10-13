import { createFileRoute } from "@tanstack/react-router";

import { DashboardSuspenseOverviewMain, prefetchDashboardOverview } from "#/modules/dashboard";

// -----
// Landing screen for the cafe owner. The loader fills the
// query cache for every card, on hover (preload) and on
// navigation, so the numbers are there when it renders.
// -----
export const Route = createFileRoute("/_dashboard/overview")({
  loader: ({ context }) => prefetchDashboardOverview(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <DashboardSuspenseOverviewMain />;
}
