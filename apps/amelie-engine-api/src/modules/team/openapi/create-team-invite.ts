import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { CreateTeamInviteBodySchema, CreatedTeamInviteSchema } from "@repo/contracts/amelie";
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

export const createTeamInviteDoc = describeRoute({
  tags: ["team"],
  summary: "Invite a team member",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  requestBody: { required: true, content: { "application/json": { schema: resolver(CreateTeamInviteBodySchema) } } },
  description: routeText({
    context:
      "A Person whose Role has `company:team:invites:create` invites an email to hold one Role in this Tenant. The plain join token is shown once.",
    steps: [
      "The server checks that Power. Anyone else on the Tenant gets 403.",
      "An email already on this Tenant is a conflict. A pending invite for that email is revoked and replaced.",
      "The server stores a hash of a random token, the Role, and an expiry seven days from now.",
      "The server returns the token and the pending invite. Copy the token now.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/team/invites?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"email":"leo@sorella.test","role":"store_staff"}\'',
      ),
      json(
        '{ "data": { "token": "…", "invite": { "id": "…", "email": "leo@sorella.test", "role": "store_staff", "expiresAt": "2026-10-23T00:00:00.000Z", "createdAt": "2026-10-16T00:00:00.000Z" } }, "error": null }',
      ),
    ],
  }),
  responses: {
    201: jsonResponse("The join token, shown once, and the pending Team invite.", envelope(CreatedTeamInviteSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
