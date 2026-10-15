import { describeRoute } from "hono-openapi";
import { PublicChatAppearanceSchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  bash,
  envelope,
  errorResponses,
  jsonResponse,
  json,
  routeText,
} from "#/lib/openapi";

export const getPublicChatAppearanceDoc = describeRoute({
  tags: ["public-chat-bot"],
  summary: "Customer chat button text and colour for a Tenant",
  description: routeText({
    context:
      "The cafe widget and Amelie's public chat page need the Tenant's Customer chat look. The answer never includes a Tenant id.",
    steps: [
      "The server finds the Tenant from the `slug`. An unknown slug gives 404.",
      "The server returns the button text and colour, or null colour for Amelie's default.",
    ],
    example: [
      "The widget looks up Sorella Cafe:",
      bash(`curl "${EXAMPLE_BASE_URL}/public/chat-bot/appearance?slug=sorella-cafe"`),
      json('{ "data": { "customerChatLabel": "Ask Sorella", "customerChatAccent": "#b4532a" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant's Customer chat look.", envelope(PublicChatAppearanceSchema)),
    ...errorResponses(400, 404),
  },
});
