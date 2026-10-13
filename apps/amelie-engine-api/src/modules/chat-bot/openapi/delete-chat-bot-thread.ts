import { describeRoute } from "hono-openapi";
import { ChatBotThreadDeletedSchema } from "@repo/contracts/chat-bots";
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

export const deleteChatBotThreadDoc = describeRoute({
  tags: ["chat-bot"],
  summary: "Delete a Thread",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context: "The team member does not want an old Thread any more and removes it from the sidebar.",
    steps: [
      "The server looks for a Thread with this id that belongs to the signed-in team member. If it finds none, the answer is 404.",
      "The server deletes the Thread.",
      "The server returns the id of the deleted Thread.",
    ],
    example: [
      "This cannot be undone:",
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/chat-bot/threads/${EXAMPLE_THREAD_ID}?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json(`{ "data": { "id": "${EXAMPLE_THREAD_ID}" }, "error": null }`),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the deleted Thread.", envelope(ChatBotThreadDeletedSchema)),
    ...errorResponses(400, 401, 404),
  },
});
