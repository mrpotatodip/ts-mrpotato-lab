import { describeRoute } from "hono-openapi";
import { TeamListSchema } from "@repo/contracts/amelie";
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

export const listTeamDoc = describeRoute({
  tags: ["team"],
  summary: "List the team",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "Any team member of this Tenant sees who is on the cafe and which Team invites are still open.",
    steps: [
      "The server checks that the signed-in Person holds a Party role in this Tenant.",
      "The server returns team members and pending Team invites. The join token is never listed.",
    ],
    example: [
      bash(`curl "${EXAMPLE_BASE_URL}/team?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json(
        '{ "data": { "members": [{ "partyId": "…", "name": "Ada Rossi", "email": "ada@sorella.test", "role": "tenant_admin" }], "invites": [] }, "error": null }',
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The team members and pending Team invites.", envelope(TeamListSchema)),
    ...errorResponses(400, 401, 404),
  },
});
