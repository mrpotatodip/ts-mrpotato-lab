import { createFileRoute } from "@tanstack/react-router";

import { fetchPublicChatAppearance } from "#/modules/chat-bot/api/fetch-public-chat-appearance";
import { publicChatFrameHeaders } from "#/modules/chat-bot/api/public-chat-frame-headers";
import { PublicChatRoom } from "#/modules/chat-bot/components/public-chat-room";
import { PublicChatSearchSchema } from "#/modules/chat-bot";
import { AppErrorComponent } from "#/modules/shared";

// -----
// The Customer's chat: no sign-in, and the
// browser talks to the engine directly.
// Appearance loads in the loader so the header
// never paints the default look first.
// -----
export const Route = createFileRoute("/chat/$slug")({
  ssr: false,
  validateSearch: PublicChatSearchSchema,
  headers: ({ params }) => publicChatFrameHeaders(params.slug),
  loader: ({ params }) => fetchPublicChatAppearance({ data: { slug: params.slug } }),
  component: RouteComponent,
  errorComponent: AppErrorComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { location, country } = Route.useSearch();
  const appearance = Route.useLoaderData();
  return <PublicChatRoom slug={slug} location={location} country={country} appearance={appearance} />;
}
