import { describeRoute } from "hono-openapi";
import { TeamDeletedSchema } from "@repo/contracts/amelie";
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

export const removeTeamMemberDoc = describeRoute({
  tags: ["team"],
  summary: "Remove a team member",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "partyId", required: true, schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "A Person whose Role has `company:team:members:delete` drops a Party role on this Tenant. The Person and login stay. The last tenant_admin cannot be removed.",
    steps: [
      "The server checks that Power.",
      "Removing the last tenant_admin is a conflict.",
      "The server deletes the Party role and returns the Person's party id.",
    ],
    example: [
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/team/members/$PARTY_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The party id of the removed team member.", envelope(TeamDeletedSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
