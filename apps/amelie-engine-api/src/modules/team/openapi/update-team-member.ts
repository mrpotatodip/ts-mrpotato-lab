import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { TeamListSchema, TeamRoleBodySchema } from "@repo/contracts/amelie";
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

export const updateTeamMemberDoc = describeRoute({
  tags: ["team"],
  summary: "Change a team member Role",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "partyId", required: true, schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(TeamRoleBodySchema) } } },
  description: routeText({
    context:
      "A Person whose Role has `company:team:members:update` changes another Person's Role on this Tenant, or their own, unless that would leave the Tenant with no tenant_admin.",
    steps: [
      "The server checks that Power.",
      "A change that would leave zero tenant_admin is a conflict.",
      "The server returns the team list.",
    ],
    example: [
      bash(
        `curl -X PATCH "${EXAMPLE_BASE_URL}/team/members/$PARTY_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"role":"store_admin"}'`,
      ),
      json('{ "data": { "members": [], "invites": [] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The team after the Role change.", envelope(TeamListSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
