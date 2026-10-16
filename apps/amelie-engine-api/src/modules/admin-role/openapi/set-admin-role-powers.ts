import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { AdminRoleDetailSchema, SetAdminRolePowersBodySchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  STAFF_SECURITY,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const setAdminRolePowersDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "Set the Powers of a role",
  security: STAFF_SECURITY,
  parameters: [{ in: "path", name: "roleId", required: true, schema: { type: "string", format: "uuid" } }],
  requestBody: { required: true, content: { "application/json": { schema: resolver(SetAdminRolePowersBodySchema) } } },
  description: routeText({
    context:
      "Replaces the full list of Powers a role grants. The change applies at once to everyone who holds the role, in every cafe. A system role can gain Powers but never lose them.",
    steps: [
      "The server checks that the caller is a superuser.",
      "The server checks every Power is in the catalogue and fits the role's scope.",
      "The server adds and removes only the difference and writes an audit entry with the old and new lists.",
    ],
    example: [
      bash(`curl -X PUT ${EXAMPLE_BASE_URL}/admin/roles/$ROLE_ID/powers -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"powers":["company:menu:items:read"]}'`),
      json('{ "data": { ... "powers": ["company:menu:items:read"] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The role and its Powers after the change.", envelope(AdminRoleDetailSchema)),
    ...errorResponses(400, 401, 404, 409),
  },
});
