import { describeRoute } from "hono-openapi";
import { CustomerThreadListSchema } from "@repo/contracts/amelie";
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

export const listCustomerThreadsDoc = describeRoute({
  tags: ["customer-threads"],
  summary: "List the Customer threads",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "A Customer chats with the assistant of a Tenant without a login. Each chat is a Customer thread. The dashboard lists them, so a team member can see what Customers ask.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server finds the Customer threads of this Tenant. Chat of team members never shows here.",
      "For each thread, the server counts the Messages and the replies that still wait for information.",
      "The server returns the newest 50, the thread with the latest Message first. It never returns the anonymous id of the Customer.",
    ],
    example: [
      bash(`curl "${EXAMPLE_BASE_URL}/customer-threads?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json(
        `{ "data": [{ "id": "${EXAMPLE_THREAD_ID}", "title": "Is there parking?", "startedAt": "2026-10-05T17:00:00.000Z", "lastMessageAt": "2026-10-05T17:01:00.000Z", "messageCount": 2, "unansweredCount": 1 }], "error": null }`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The Customer threads, newest first.", envelope(CustomerThreadListSchema)),
    ...errorResponses(400, 401, 404),
  },
});
