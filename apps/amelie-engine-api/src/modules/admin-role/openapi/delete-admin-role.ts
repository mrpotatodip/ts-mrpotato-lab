import { describeRoute } from "hono-openapi";
import { AdminRoleDeletedSchema } from "@repo/contracts/amelie";
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

export const deleteAdminRoleDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "Delete a role",
  security: STAFF_SECURITY,
  parameters: [{ in: "path", name: "roleId", required: true, schema: { type: "string", format: "uuid" } }],
  description: routeText({
    context:
      "Removes a role nobody uses. A role someone holds or was invited to must be disabled instead. A system role cannot be deleted.",
    steps: [
      "The server checks that the caller is a superuser.",
      "The server refuses if the role is a system role, held by anyone, or used by any invite.",
      "The server deletes its cafe Role rows and its Powers, and writes an audit entry.",
    ],
    example: [
      bash(`curl -X DELETE ${EXAMPLE_BASE_URL}/admin/roles/$ROLE_ID -H "Authorization: Bearer $TOKEN"`),
      json('{ "data": { "id": "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the deleted role.", envelope(AdminRoleDeletedSchema)),
    ...errorResponses(400, 401, 404, 409),
  },
});
