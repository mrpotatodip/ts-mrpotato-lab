import { describeRoute } from "hono-openapi";
import { AdminRoleDetailSchema } from "@repo/contracts/amelie";
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

export const getAdminRoleDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "Show one role with its Powers",
  security: STAFF_SECURITY,
  parameters: [{ in: "path", name: "roleId", required: true, schema: { type: "string", format: "uuid" } }],
  description: routeText({
    context:
      "Shows one Master Role and the exact Powers it grants.",
    steps: [
      "The server checks that the caller is a superuser.",
      "The server returns the role and its Power strings, sorted.",
    ],
    example: [
      bash(`curl ${EXAMPLE_BASE_URL}/admin/roles/$ROLE_ID -H "Authorization: Bearer $TOKEN"`),
      json('{ "data": { ... , "powers": ["company:menu:items:read"] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The role and its Powers.", envelope(AdminRoleDetailSchema)),
    ...errorResponses(400, 401, 404),
  },
});
