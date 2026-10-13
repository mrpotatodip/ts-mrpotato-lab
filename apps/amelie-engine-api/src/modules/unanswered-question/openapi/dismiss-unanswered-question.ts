import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  STAFF_SECURITY,
  TENANT_ID_QUERY_PARAMETER,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

const DismissedSchema = z.object({ messageId: z.string() });

export const dismissUnansweredQuestionDoc = describeRoute({
  tags: ["unanswered-questions"],
  summary: "Dismiss an Unanswered question",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "The team member has read an Unanswered question and does not need to see it again. For example, they added a FAQ about parking. They dismiss the question.",
    steps: [
      "The server looks for the assistant reply with this `messageId` in this Tenant. The reply must have reported a Missing topic.",
      "If it finds none, the answer is 404. A reply of another Tenant also gives 404.",
      "The server marks the reply as dismissed. It keeps the first dismissal time, so dismissing twice is safe.",
      "The server returns the `messageId`. The list route no longer shows this question.",
    ],
    example: [
      "Use the `messageId` from the list route:",
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/unanswered-questions/msg_1/dismiss?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json('{ "data": { "messageId": "msg_1" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the dismissed reply.", envelope(DismissedSchema)),
    ...errorResponses(400, 401, 404),
  },
});
