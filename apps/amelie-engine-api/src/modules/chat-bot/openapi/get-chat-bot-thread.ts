import { describeRoute } from "hono-openapi";
import { ChatBotThreadDetailSchema } from "@repo/contracts/chat-bots";
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

export const getChatBotThreadDoc = describeRoute({
  tags: ["chat-bot"],
  summary: "Get one Thread with its Messages",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "The team member clicks a Thread in the sidebar. The dashboard needs every Message of that Thread, in order.",
    steps: [
      "The server looks for a Thread with this id that belongs to the signed-in team member.",
      "If it finds one, it returns the Thread and its Messages. If not, the answer is 404.",
      "An assistant Message also lists the tools it used, and the cards (`structure`) that the dashboard shows next to the text.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/chat-bot/threads/${EXAMPLE_THREAD_ID}?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      "A Thread of someone else gives 404, the same as a Thread that does not exist.",
    ],
  }),
  responses: {
    200: jsonResponse("The Thread and its Messages.", envelope(ChatBotThreadDetailSchema)),
    ...errorResponses(400, 401, 404),
  },
});
