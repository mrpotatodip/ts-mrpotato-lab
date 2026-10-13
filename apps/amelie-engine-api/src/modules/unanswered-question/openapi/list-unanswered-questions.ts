import { describeRoute } from "hono-openapi";
import { UnansweredQuestionListSchema } from "@repo/contracts/amelie";
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

export const listUnansweredQuestionsDoc = describeRoute({
  tags: ["unanswered-questions"],
  summary: "List the questions the assistant could not answer",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "A Customer asks something that the Tenant's information does not cover, for example \"Is there parking?\". The assistant reports a *Missing topic* (here: `parking`). Its reply becomes an *Unanswered question*. The dashboard shows these, so the team member can add the missing information.",
    steps: [
      "The server finds the assistant replies in this Tenant's Customer Threads that reported a Missing topic. Chat of team members never counts.",
      "The server skips the ones that a team member already dismissed.",
      "For each reply, the server adds the Customer's question: the Message just before the reply.",
      "The server returns the newest 100, and a `summary` of the last 7 days in the Tenant's own timezone.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/unanswered-questions?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json(
        `{\n  "data": {\n    "summary": { "weekQuestions": 42, "weekUnanswered": 3 },\n    "questions": [\n      { "messageId": "msg_1", "threadId": "${EXAMPLE_THREAD_ID}", "question": "Is there parking?", "topics": ["parking"], "askedAt": "2026-10-05T09:02:00.000Z" }\n    ]\n  },\n  "error": null\n}`,
      ),
      "Here 3 of 42 questions this week had no answer.",
    ],
  }),
  responses: {
    200: jsonResponse("The open Unanswered questions and the counts of the week.", envelope(UnansweredQuestionListSchema)),
    ...errorResponses(400, 401, 404),
  },
});
