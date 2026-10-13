import { describeRoute } from "hono-openapi";
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
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const updateChatBotThreadTitleDoc = describeRoute({
  tags: ["chat-bot"],
  summary: "Rename a Thread",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "A new Thread gets a title from the first words of its first Message. The team member can choose a better title.",
    steps: [
      "The server checks the new title: 1 to 120 characters, with spaces at both ends removed.",
      "The server looks for a Thread with this id that belongs to the signed-in team member. If it finds none, the answer is 404.",
      "The server saves the new title and returns the Thread.",
    ],
    example: [
      "Rename the Thread to `Opening hours`:",
      bash(
        `curl -X PATCH "${EXAMPLE_BASE_URL}/chat-bot/threads/${EXAMPLE_THREAD_ID}?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" \\',
        '  -H "Content-Type: application/json" \\',
        `  -d '{ "title": "Opening hours" }'`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The Thread with its new title.", envelope(ChatBotThreadListItemSchema)),
    ...errorResponses(400, 401, 404),
  },
});
