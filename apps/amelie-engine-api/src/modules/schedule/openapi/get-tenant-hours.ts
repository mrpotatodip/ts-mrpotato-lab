import { describeRoute } from "hono-openapi";
import { TenantHoursSchema } from "@repo/contracts/amelie";
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

export const getTenantHoursDoc = describeRoute({
  tags: ["schedule"],
  summary: "Get the weekly hours and special dates",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "The dashboard shows the weekly Business hours and the coming Hours overrides, such as a holiday. The times are in the timezone of the Location. Pass locationId to choose a Location; a Tenant with one Location needs no locationId.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server reads the weekly hours, Sunday to Saturday. A day with no hours has isSet false.",
      "The server reads the Hours overrides from today on, in the timezone of the Location.",
    ],
    example: [
      "Read the hours of one Tenant:",
      bash(`curl "${EXAMPLE_BASE_URL}/schedule?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json(
        '{\n  "data": {\n    "timezone": "America/New_York",\n    "weekly": [{ "weekday": "Sunday", "isSet": true, "isClosed": false, "opensAt": "08:00", "closesAt": "14:00" }],\n    "specialDates": [{ "date": "2026-12-25", "isClosed": true, "opensAt": null, "closesAt": null, "note": "Christmas" }]\n  },\n  "error": null\n}',
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The weekly hours and the special dates.", envelope(TenantHoursSchema)),
    ...errorResponses(400, 401, 404),
  },
});
