import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { SetWeeklyHoursBodySchema, WeeklyHoursSchema } from "@repo/contracts/amelie";
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

export const setWeeklyHoursDoc = describeRoute({
  tags: ["schedule"],
  summary: "Set the hours of one weekday",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "dayOfWeek", required: true, description: "0 is Sunday, 6 is Saturday.", schema: { type: "integer", minimum: 0, maximum: 6 } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(SetWeeklyHoursBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin sets when the cafe opens and closes on one weekday, or marks the day closed. The assistant uses these hours to answer Customers.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server checks the times. They are 24-hour HH:MM. An open day needs opensAt before closesAt. A closed day has no times.",
      "The server saves the hours of that weekday and returns them.",
    ],
    example: [
      "Open on Monday from 08:00 to 16:00:",
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/schedule/hours/1?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"isClosed":false,"opensAt":"08:00","closesAt":"16:00"}\'',
      ),
      json('{ "data": { "weekday": "Monday", "isSet": true, "isClosed": false, "opensAt": "08:00", "closesAt": "16:00" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved hours of that weekday.", envelope(WeeklyHoursSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
