import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  EXAMPLE_ANONYMOUS_ID,
  EXAMPLE_BASE_URL,
  EXAMPLE_THREAD_ID,
  bash,
  errorResponses,
  jsonResponse,
  routeText,
} from "#/lib/openapi";
import { ChatBotHydrateMessageSchema } from "#/modules/chat-bot/schemas";

const HydrateSchema = z.object({
  messages: z.array(ChatBotHydrateMessageSchema),
  activeRun: z.object({ runId: z.string() }).nullable(),
});

export const publicHydrateOrJoinChatBotDoc = describeRoute({
  tags: ["public-chat-bot"],
  summary: "A Customer reloads a Thread, or rejoins a running answer",
  description: routeText({
    context:
      "A Customer reloads the page while the assistant still writes. The widget needs the old Messages of the Thread, and it must pick up the live answer where it stopped.",
    steps: [
      "The server finds the Tenant from the `slug` and checks the Allowed origin, the same as for a new Message.",
      "If the request has an `offset`, the server joins the run and streams the answer from that offset. The run must belong to this anonymous id.",
      "If the request has no `offset`, the server returns the saved Messages and `activeRun`. The Thread must belong to this anonymous id.",
      "This route has no rate limit. A rejoin never sends a new Message.",
    ],
    example: [
      "The widget loads the Thread after a reload:",
      bash(
        `curl "${EXAMPLE_BASE_URL}/public/chat-bot?slug=sorella-cafe&threadId=${EXAMPLE_THREAD_ID}" \\`,
        '  -H "Origin: https://sorellacafe.com" \\',
        `  -H "x-anonymous-id: ${EXAMPLE_ANONYMOUS_ID}"`,
      ),
      "A Customer cannot read the Thread of another Customer. The answer is 404.",
    ],
  }),
  responses: {
    200: {
      description:
        "Without `offset`: JSON with the Messages and the active run. With `offset`: a stream of server-sent events.",
      content: {
        ...jsonResponse("", HydrateSchema).content,
        "text/event-stream": { schema: { type: "string" } },
      },
    },
    ...errorResponses(400, 403, 404),
  },
});
