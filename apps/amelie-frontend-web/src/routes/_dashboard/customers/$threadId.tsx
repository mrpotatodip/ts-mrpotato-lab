import { createFileRoute } from "@tanstack/react-router";

import { CustomerThreadSuspenseViewMain } from "#/modules/customer-thread";
import { prefetchCustomerThreadPage } from "#/modules/dashboard";

// -----
// One Customer chat, read-only.
// -----
export const Route = createFileRoute("/_dashboard/customers/$threadId")({
  loader: ({ context, params }) => prefetchCustomerThreadPage(context.queryClient, params.threadId),
  component: RouteComponent,
});

function RouteComponent() {
  const { threadId } = Route.useParams();

  return <CustomerThreadSuspenseViewMain threadId={threadId} />;
}
