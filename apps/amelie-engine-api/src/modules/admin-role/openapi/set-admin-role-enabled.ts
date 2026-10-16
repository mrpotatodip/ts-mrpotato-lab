import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { AdminRoleDetailSchema, SetAdminRoleEnabledBodySchema } from "@repo/contracts/amelie";
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

export const setAdminRoleEnabledDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "Enable or disable a role",
  security: STAFF_SECURITY,
  parameters: [{ in: "path", name: "roleId", required: true, schema: { type: "string", format: "uuid" } }],
  requestBody: { required: true, content: { "application/json": { schema: resolver(SetAdminRoleEnabledBodySchema) } } },
  description: routeText({
    context:
      "Enabling makes the role assignable in every cafe. Disabling only stops new assignments: people who already hold it keep their Powers. A system role cannot be disabled.",
    steps: [
      "The server checks that the caller is a superuser.",
      "On enable, the server gives every existing cafe a Role row for it. New cafes get one at sign-up.",
      "The server writes an audit entry.",
    ],
    example: [
      bash(`curl -X PUT ${EXAMPLE_BASE_URL}/admin/roles/$ROLE_ID/enabled -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"enabled":true}'`),
      json('{ "data": { ... "enabled": true }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The role after the change.", envelope(AdminRoleDetailSchema)),
    ...errorResponses(400, 401, 404, 409),
  },
});
