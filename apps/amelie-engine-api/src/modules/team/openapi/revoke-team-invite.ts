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

export const revokeTeamInviteDoc = describeRoute({
  tags: ["team"],
  summary: "Revoke a pending Team invite",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "inviteId", required: true, schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context: "A Person whose Role has `company:team:invites:delete` revokes a pending Team invite. The join link stops working.",
    steps: [
      "The server checks that Power.",
      "The server revokes the pending invite. Already used or unknown ids are 404.",
    ],
    example: [
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/team/invites/$INVITE_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the revoked Team invite.", envelope(TeamDeletedSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
