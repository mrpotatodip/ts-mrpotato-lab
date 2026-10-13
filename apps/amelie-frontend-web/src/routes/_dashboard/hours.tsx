import { createFileRoute } from "@tanstack/react-router";

import { prefetchHoursPage } from "#/modules/dashboard";
import { ScheduleSuspensePanelMain } from "#/modules/schedule";

// -----
// Weekly hours and special dates, as the
// assistant tells them to Customers.
// -----
export const Route = createFileRoute("/_dashboard/hours")({
  loader: ({ context }) => prefetchHoursPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <ScheduleSuspensePanelMain />;
}
