import { createFileRoute } from "@tanstack/react-router";

import { chatBotQueries } from "#/modules/chat-bot";

export const Route = createFileRoute("/_dashboard/chat-bot/_room/$threadId")({
  loader: async ({ context, params }) =>
    context.queryClient.query({
      ...chatBotQueries.detail(params.threadId),
      staleTime: "static",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  return null;
}
