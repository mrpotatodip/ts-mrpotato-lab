import { createFileRoute } from "@tanstack/react-router";

import { ChatBotRoom } from "#/modules/chat-bot";

// -----
// The assistant that changes the cafe for you: hours,
// prices, what is sold out, FAQs and the profile.
// -----
export const Route = createFileRoute("/_dashboard/chat-bot/_room")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ChatBotRoom />;
}
