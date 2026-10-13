import { createFileRoute } from "@tanstack/react-router";

import { prefetchUnansweredPage } from "#/modules/dashboard";
import { UnansweredQuestionSuspenseListMain } from "#/modules/unanswered-question";

// -----
// What Customers asked that the assistant
// could not answer.
// -----
export const Route = createFileRoute("/_dashboard/unanswered")({
  loader: ({ context }) => prefetchUnansweredPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <UnansweredQuestionSuspenseListMain />;
}
