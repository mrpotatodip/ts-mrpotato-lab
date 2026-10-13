import { describeRoute } from "hono-openapi";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  EXAMPLE_THREAD_ID,
  SSE_RESPONSE_HEADERS,
  STAFF_SECURITY,
  TENANT_ID_QUERY_PARAMETER,
  bash,
  errorResponses,
  routeText,
} from "#/lib/openapi";

export const streamChatBotDoc = describeRoute({
  tags: ["chat-bot"],
  summary: "Send a Message and stream the answer",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "A team member types a Message in the dashboard chat. The assistant needs time to write the answer, so the server does not wait to send it. It streams the answer as it is written, with server-sent events (SSE).",
    steps: [
      "The server checks the session token and that the caller is a team member of `tenantId`.",
      "The server records a *run*. A run is one attempt by the bot to answer one Message.",
      "The server saves the Message. A first Message (no `threadId`) also makes a new Thread.",
      "The server starts the assistant in the background and answers with the stream. The `X-Thread-Id` header holds the Thread id.",
      "To read the same answer again, send the same `x-run-id` with an `offset`. See `GET /chat-bot`.",
    ],
    example: [
      "Ask a question in a new Thread. The `-N` flag tells curl to show the stream as it arrives:",
      bash(
        `curl -N -X POST "${EXAMPLE_BASE_URL}/chat-bot?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" \\',
        '  -H "Content-Type: application/json" \\',
        `  -d '{ "content": "What are our hours this week?" }'`,
      ),
      "Each event is one chunk of the answer, as JSON. This one is shortened:",
      bash('data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m1","delta":"We open at 8 on weekdays"}'),
      `To ask a follow-up in the same Thread, add \`"threadId": "${EXAMPLE_THREAD_ID}"\` to the body.`,
    ],
  }),
  responses: {
    200: {
      description:
        "A stream of server-sent events. Each event is one chunk of the answer. The stream ends when the answer is complete.",
      headers: SSE_RESPONSE_HEADERS,
      content: { "text/event-stream": { schema: { type: "string" } } },
    },
    ...errorResponses(401, 404, 409),
  },
});
