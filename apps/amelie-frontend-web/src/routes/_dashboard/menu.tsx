import { createFileRoute } from "@tanstack/react-router";

import { prefetchMenuPage } from "#/modules/dashboard";
import { MenuSuspensePanelMain } from "#/modules/menu";

// -----
// The menu the assistant tells Customers about:
// categories, items, Variants and Dietary tags.
// -----
export const Route = createFileRoute("/_dashboard/menu")({
  loader: ({ context }) => prefetchMenuPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <MenuSuspensePanelMain />;
}
