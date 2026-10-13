import { createFileRoute } from "@tanstack/react-router";

import { WidgetSuspensePanelMain } from "#/modules/widget";

export const Route = createFileRoute("/_dashboard/widget")({
  component: RouteComponent,
});

function RouteComponent() {
  return <WidgetSuspensePanelMain />;
}
