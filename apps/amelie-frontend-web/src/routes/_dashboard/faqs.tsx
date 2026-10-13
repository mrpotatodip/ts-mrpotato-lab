import { createFileRoute } from "@tanstack/react-router";

import { prefetchFaqsPage } from "#/modules/dashboard";
import { FaqSuspensePanelMain } from "#/modules/faq";

// -----
// The questions the assistant answers from,
// grouped in the Tenant's own categories.
// -----
export const Route = createFileRoute("/_dashboard/faqs")({
  loader: ({ context }) => prefetchFaqsPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <FaqSuspensePanelMain />;
}
