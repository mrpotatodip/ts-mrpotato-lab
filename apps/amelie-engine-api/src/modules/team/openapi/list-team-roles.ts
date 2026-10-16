import { describeRoute } from "hono-openapi";
import { TeamRolesSchema } from "@repo/contracts/amelie";
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

export const listTeamRolesDoc = describeRoute({
  tags: ["team"],
  summary: "List the Roles the signed-in Person can assign",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "Feeds the Role picker when inviting or changing a team member. Only Roles whose Powers the signed-in Person holds in full are listed, so nobody can hand out more than they have.",
    steps: [
      "The server checks `company:team:members:read`.",
      "The server lists the enabled tenant Roles this Tenant has, keeps those whose Powers are all held by the caller, and orders them by fewest Powers first.",
    ],
    example: [
      bash(`curl "${EXAMPLE_BASE_URL}/team/roles?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json('{ "data": [{ "key": "store_staff", "label": "Store staff", "description": null }], "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The Roles the caller can assign.", envelope(TeamRolesSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
