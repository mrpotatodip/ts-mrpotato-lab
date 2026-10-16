import { describeRoute } from "hono-openapi";
import { AdminRolesSchema } from "@repo/contracts/amelie";
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

export const listAdminRolesDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "List every role",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "Shows the superuser every Master Role, enabled or not, with how many Powers it has and how many people hold it.",
    steps: [
      "The server checks that the caller is a superuser. Anyone else gets 404.",
      "The server returns every Master Role, oldest first.",
    ],
    example: [
      bash(`curl ${EXAMPLE_BASE_URL}/admin/roles -H "Authorization: Bearer $TOKEN"`),
      json('{ "data": [{ "id": "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d", "key": "shift_lead", "label": "Shift lead", "description": null, "scope": "tenant", "enabled": false, "isSystem": false, "powerCount": 0, "holderCount": 0 }], "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The roles.", envelope(AdminRolesSchema)),
    ...errorResponses(401, 404),
  },
});
