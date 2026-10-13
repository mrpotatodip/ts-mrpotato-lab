import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { ChatBotThreadListItemSchema } from "@repo/contracts/chat-bots";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  EXAMPLE_THREAD_ID,
  STAFF_SECURITY,
  TENANT_ID_QUERY_PARAMETER,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const listChatBotThreadsDoc = describeRoute({
  tags: ["chat-bot"],
  summary: "List my Threads",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "A Thread is one conversation in the chat bot. The dashboard shows a list of old Threads in a sidebar. This route gives that list.",
    steps: [
      "The server finds the Threads of the signed-in team member in this Tenant.",
      "If the request has `trigger` or `module`, the server keeps only the Threads that match.",
      "The server returns the list. It has no Messages: get one Thread to read them.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/chat-bot/threads?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json(
        `{\n  "data": [\n    { "id": "${EXAMPLE_THREAD_ID}", "title": "What are our hours this week?", "trigger": "chat", "module": "chat", "createdAt": "2026-10-05T09:00:00.000Z", "updatedAt": "2026-10-05T09:02:00.000Z" }\n  ],\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The Threads of this team member.", envelope(z.array(ChatBotThreadListItemSchema))),
    ...errorResponses(400, 401, 404),
  },
});
