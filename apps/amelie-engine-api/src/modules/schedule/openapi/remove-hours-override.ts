import { describeRoute } from "hono-openapi";
import { z } from "zod";
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

export const removeHoursOverrideDoc = describeRoute({
  tags: ["schedule"],
  summary: "Remove the hours of one date",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "date", required: true, description: "The date, as YYYY-MM-DD.", schema: { type: "string", format: "date" } },
  ],
  description: routeText({
    context:
      "A tenant_admin or store_admin removes special hours. The date then follows the weekly hours again.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server deletes the special date of this Tenant. If there is none, the answer is 404.",
      "The server returns the date.",
    ],
    example: [
      "Remove the Christmas hours:",
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/schedule/overrides/2026-12-25?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json('{ "data": { "date": "2026-12-25" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The date that was removed.", envelope(z.object({ date: z.string() }))),
    ...errorResponses(400, 401, 403, 404),
  },
});
