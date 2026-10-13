import { createFileRoute } from "@tanstack/react-router";

import { CustomerThreadSuspenseListMain } from "#/modules/customer-thread";
import { prefetchCustomersPage } from "#/modules/dashboard";

// -----
// What Customers said to the assistant.
// -----
export const Route = createFileRoute("/_dashboard/customers/")({
  loader: ({ context }) => prefetchCustomersPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <CustomerThreadSuspenseListMain />;
}
