import { createFileRoute } from "@tanstack/react-router";

import { PublicChatRoom, PublicChatSearchSchema } from "#/modules/chat-bot";
import { AppErrorComponent } from "#/modules/shared";

// -----
// The Customer's chat: no sign-in, and the
// browser talks to the engine directly.
// -----
export const Route = createFileRoute("/chat/$slug")({
  ssr: false,
  validateSearch: PublicChatSearchSchema,
  component: RouteComponent,
  errorComponent: AppErrorComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { location, country } = Route.useSearch();
  return <PublicChatRoom slug={slug} location={location} country={country} />;
}
