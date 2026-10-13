import { describeRoute } from "hono-openapi";
import { CustomerThreadDetailSchema } from "@repo/contracts/amelie";
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

export const getCustomerThreadDoc = describeRoute({
  tags: ["customer-threads"],
  summary: "Get one Customer thread with its Messages",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "threadId", required: true, description: "The id of the Customer thread.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "A team member opens one Customer thread to read the whole chat: what the Customer asked and what the assistant answered.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server looks for the thread in this Tenant. A thread of another Tenant, or a chat of a team member, gives 404.",
      "The server returns the Messages in order. A reply that reported a Missing topic lists the topic.",
    ],
    example: [
      bash(`curl "${EXAMPLE_BASE_URL}/customer-threads/${EXAMPLE_THREAD_ID}?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json(
        `{ "data": { "id": "${EXAMPLE_THREAD_ID}", "title": "Is there parking?", "startedAt": "2026-10-05T17:00:00.000Z", "messages": [{ "id": "m1", "role": "user", "content": "Is there parking?", "createdAt": "2026-10-05T17:00:00.000Z", "missingTopics": [], "isDismissed": false }, { "id": "m2", "role": "assistant", "content": "We do not have parking details.", "createdAt": "2026-10-05T17:00:02.000Z", "missingTopics": ["parking"], "isDismissed": false }] }, "error": null }`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The thread and its Messages.", envelope(CustomerThreadDetailSchema)),
    ...errorResponses(400, 401, 404),
  },
});
