import { describeRoute } from "hono-openapi";
import { PublicChatFramePolicySchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  bash,
  envelope,
  errorResponses,
  jsonResponse,
  json,
  routeText,
} from "#/lib/openapi";

export const getPublicChatFramePolicyDoc = describeRoute({
  tags: ["public-chat-bot"],
  summary: "Who may iframe a Tenant's Customer chat",
  description: routeText({
    context:
      "Amelie's chat page needs the Tenant's Allowed origins so it can set Content-Security-Policy frame-ancestors. The cafe's own websites are not a secret. The answer never includes a Tenant id.",
    steps: [
      "The server finds the Tenant from the `slug`. An unknown slug gives 404.",
      "The server returns that Tenant's Allowed origins and nothing else.",
      "An empty list means the chat page must not be framed (`frame-ancestors 'none'`).",
    ],
    example: [
      "Amelie's chat page looks up Sorella Cafe:",
      bash(`curl "${EXAMPLE_BASE_URL}/public/chat-bot/frame-policy?slug=sorella-cafe"`),
      json('{ "data": { "allowedOrigins": ["https://sorellacafe.com"] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant's Allowed origins.", envelope(PublicChatFramePolicySchema)),
    ...errorResponses(400, 404),
  },
});
