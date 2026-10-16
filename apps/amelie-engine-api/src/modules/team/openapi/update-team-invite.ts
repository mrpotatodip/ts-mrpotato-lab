import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { TeamInviteSchema, TeamRoleBodySchema } from "@repo/contracts/amelie";
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

export const updateTeamInviteDoc = describeRoute({
  tags: ["team"],
  summary: "Change a pending Team invite Role",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "inviteId", required: true, schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(TeamRoleBodySchema) } } },
  description: routeText({
    context: "A Person whose Role has `company:team:invites:update` changes the Role on a pending Team invite. The join link stays the same.",
    steps: [
      "The server checks that Power.",
      "The server updates the pending invite. Revoked, accepted or unknown ids are 404.",
    ],
    example: [
      bash(
        `curl -X PATCH "${EXAMPLE_BASE_URL}/team/invites/$INVITE_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"role":"store_admin"}'`,
      ),
      json('{ "data": { "id": "…", "email": "leo@sorella.test", "role": "store_admin", "expiresAt": "2026-10-23T00:00:00.000Z", "createdAt": "2026-10-16T00:00:00.000Z" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The pending Team invite.", envelope(TeamInviteSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
