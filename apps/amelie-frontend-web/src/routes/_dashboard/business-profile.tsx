import { createFileRoute } from "@tanstack/react-router";

import { BusinessProfileSuspensePanelMain } from "#/modules/business-profile";
import { prefetchBusinessProfilePage } from "#/modules/dashboard";

// -----
// The contact facts the assistant tells Customers.
// -----
export const Route = createFileRoute("/_dashboard/business-profile")({
  loader: ({ context }) => prefetchBusinessProfilePage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <BusinessProfileSuspensePanelMain />;
}
