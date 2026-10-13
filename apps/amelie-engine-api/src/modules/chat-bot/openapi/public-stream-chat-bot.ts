import { describeRoute } from "hono-openapi";
import {
  EXAMPLE_ANONYMOUS_ID,
  EXAMPLE_BASE_URL,
  SSE_RESPONSE_HEADERS,
  bash,
  errorResponses,
  routeText,
} from "#/lib/openapi";

export const publicStreamChatBotDoc = describeRoute({
  tags: ["public-chat-bot"],
  summary: "A Customer sends a Message and streams the answer",
  description: routeText({
    context:
      "A Customer types a question in the chat widget on a Tenant's website. The Customer has no account. The widget knows the Tenant by its slug and the Customer by a random anonymous id that the browser keeps.",
    steps: [
      "The server rejects a body larger than 4 KB (413) or a wrong shape (400).",
      "The server finds the Tenant from the `slug`. An unknown slug gives 404. The browser never sends a Tenant id.",
      "The server checks the `Origin` header. It must be one of the Tenant's Allowed origins, or an Amelie page. If not, the answer is 403.",
      "The server checks the limits: Messages per minute, new Threads per minute, 30 Messages per Thread, 1000 Messages per Tenant per day. Over a limit gives 429.",
      "The server records the run and saves the Message. A request without `threadId` starts a new anonymous Thread.",
      "The server answers with a stream of server-sent events. The `X-Thread-Id` header holds the Thread id: the widget keeps it for the next Message.",
    ],
    example: [
      "A Customer of Sorella Cafe asks two questions in one Message:",
      bash(
        `curl -N -X POST ${EXAMPLE_BASE_URL}/public/chat-bot \\`,
        '  -H "Origin: https://sorellacafe.com" \\',
        `  -H "x-anonymous-id: ${EXAMPLE_ANONYMOUS_ID}" \\`,
        '  -H "Content-Type: application/json" \\',
        `  -d '{ "slug": "sorella-cafe", "content": "Are you open on Sunday? Do you have vegan food?" }'`,
      ),
      "An anonymous Thread ends after 30 minutes idle, or after 24 hours. The widget then starts a new one by itself.",
    ],
  }),
  responses: {
    200: {
      description: "A stream of server-sent events. Each event is one chunk of the answer.",
      headers: SSE_RESPONSE_HEADERS,
      content: { "text/event-stream": { schema: { type: "string" } } },
    },
    ...errorResponses(400, 403, 404, 413, 429),
  },
});
