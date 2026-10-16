import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { SetHoursOverrideBodySchema, SpecialDateSchema } from "@repo/contracts/amelie";
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

export const setHoursOverrideDoc = describeRoute({
  tags: ["schedule"],
  summary: "Set the hours of one date",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "date", required: true, description: "The date, as YYYY-MM-DD, in the timezone of the Tenant.", schema: { type: "string", format: "date" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(SetHoursOverrideBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin sets special hours for one date, such as a holiday. This replaces the weekly hours for that date only.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server checks the times, as for the weekly hours. The note is short text, or null.",
      "The server rejects a date that already passed in the timezone of the Tenant. Today is allowed.",
      "The server saves the special date. A second save for the same date replaces the first.",
    ],
    example: [
      "Close on Christmas:",
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/schedule/overrides/2026-12-25?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"isClosed":true,"opensAt":null,"closesAt":null,"note":"Christmas"}\'',
      ),
      json('{ "data": { "date": "2026-12-25", "isClosed": true, "opensAt": null, "closesAt": null, "note": "Christmas" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved special date.", envelope(SpecialDateSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
