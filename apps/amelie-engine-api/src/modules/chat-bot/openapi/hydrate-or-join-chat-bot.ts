import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  EXAMPLE_THREAD_ID,
  STAFF_SECURITY,
  TENANT_ID_QUERY_PARAMETER,
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

export const hydrateOrJoinChatBotDoc = describeRoute({
  tags: ["chat-bot"],
  summary: "Load a Thread, or rejoin a running answer",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "The team member reloads the page while the assistant still writes an answer. Or the connection drops. The dashboard needs the old Messages, and it needs to pick up the live answer where it stopped. This one route does both jobs.",
    steps: [
      "If the request has an `offset`, the server *joins* the run. It checks the run belongs to the caller. It then streams the answer from that offset.",
      "If the request has no `offset`, the server *hydrates*. It checks the Thread belongs to the caller. It returns the saved Messages and `activeRun`.",
      "`activeRun` is `null` when no answer is being written. Otherwise it holds the `runId`. The dashboard then calls this route again with that `runId` and an `offset`.",
    ],
    example: [
      "Step 1. Reload: ask for the Thread.",
      bash(
        `curl "${EXAMPLE_BASE_URL}/chat-bot?tenantId=${EXAMPLE_TENANT_ID}&threadId=${EXAMPLE_THREAD_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      "Step 2. The answer is not finished (`activeRun` is not null). Join it:",
      bash(
        `curl -N "${EXAMPLE_BASE_URL}/chat-bot?tenantId=${EXAMPLE_TENANT_ID}&runId=run-1&offset=-1" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      "This route does not use the `{ data, error }` envelope for its JSON answer. The chat library on the dashboard reads the bare object.",
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
    ...errorResponses(401, 404),
  },
});
