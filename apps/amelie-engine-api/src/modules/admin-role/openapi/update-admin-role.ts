import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { AdminRoleDetailSchema, UpdateAdminRoleBodySchema } from "@repo/contracts/amelie";
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

export const updateAdminRoleDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "Edit a role label or description",
  security: STAFF_SECURITY,
  parameters: [{ in: "path", name: "roleId", required: true, schema: { type: "string", format: "uuid" } }],
  requestBody: { required: true, content: { "application/json": { schema: resolver(UpdateAdminRoleBodySchema) } } },
  description: routeText({
    context:
      "Changes how a role is named in the dashboard. The key stays the same.",
    steps: [
      "The server checks that the caller is a superuser.",
      "The server saves the new label and description and writes an audit entry.",
    ],
    example: [
      bash(`curl -X PATCH ${EXAMPLE_BASE_URL}/admin/roles/$ROLE_ID -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"label":"Shift leader"}'`),
      json('{ "data": { ... "label": "Shift leader" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The role after the change.", envelope(AdminRoleDetailSchema)),
    ...errorResponses(400, 401, 404),
  },
});
