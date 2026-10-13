import { describeRoute } from "hono-openapi";
import {
  LocationListSchema,
} from "@repo/contracts/amelie";
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

const EXAMPLE_LOCATION =
  '{ "id": "…", "name": "Airport", "slug": "airport", "countryId": "…", "address": null, "phone": null, "timezone": "America/New_York", "archivedAt": null }';

export const listLocationsDoc = describeRoute({
  tags: ["locations"],
  summary: "List Locations",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context: "The dashboard lists the Tenant's Locations, so a team member can switch between them or manage them.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server reads every Location of this Tenant, oldest first. Archived ones carry an archivedAt date.",
    ],
    example: [
      bash(`curl "${EXAMPLE_BASE_URL}/locations?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json(`{ "data": [${EXAMPLE_LOCATION}], "error": null }`),
    ],
  }),
  responses: {
    200: jsonResponse("The Locations.", envelope(LocationListSchema)),
    ...errorResponses(400, 401, 404),
  },
});
