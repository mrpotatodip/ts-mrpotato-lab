import { createFileRoute } from "@tanstack/react-router";

import { prefetchFaqsPage } from "#/modules/dashboard";
import { FaqSearchSchema, FaqSuspensePanelMain } from "#/modules/faq";

export const Route = createFileRoute("/_dashboard/faqs")({
  validateSearch: FaqSearchSchema,
  loader: ({ context }) => prefetchFaqsPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  const { category } = Route.useSearch();
  return <FaqSuspensePanelMain categoryKey={category} />;
}
