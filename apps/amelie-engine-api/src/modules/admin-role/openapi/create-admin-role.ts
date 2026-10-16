import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { AdminRoleDetailSchema, CreateAdminRoleBodySchema } from "@repo/contracts/amelie";
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

export const createAdminRoleDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "Create a role",
  security: STAFF_SECURITY,
  requestBody: { required: true, content: { "application/json": { schema: resolver(CreateAdminRoleBodySchema) } } },
  description: routeText({
    context:
      "A superuser adds a new Role type that every cafe can later assign. It starts disabled and with no Powers, so nobody sees it until it is set up and enabled.",
    steps: [
      "The server checks that the caller is a superuser.",
      "The server saves a tenant Master Role with the given key, label and description. The key can never change.",
      "The server writes an audit entry.",
    ],
    example: [
      bash(`curl -X POST ${EXAMPLE_BASE_URL}/admin/roles -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"key":"shift_lead","label":"Shift lead"}'`),
      json('{ "data": { ... "key": "shift_lead", "enabled": false, "powers": [] }, "error": null }'),
    ],
  }),
  responses: {
    201: jsonResponse("The new role.", envelope(AdminRoleDetailSchema)),
    ...errorResponses(400, 401, 404, 409),
  },
});
