import { createFileRoute } from "@tanstack/react-router";

import { prefetchMenuPage } from "#/modules/dashboard";
import { MenuSuspensePanelMain } from "#/modules/menu";

export const Route = createFileRoute("/_dashboard/store-menu")({
  loader: ({ context }) => prefetchMenuPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <MenuSuspensePanelMain kind="floor" />;
}
