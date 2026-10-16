import { describeRoute, resolver } from "hono-openapi";
import {
  LocationSchema,
  UpdateLocationBodySchema,
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

export const updateLocationDoc = describeRoute({
  tags: ["locations"],
  summary: "Edit a Location",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  requestBody: { required: true, content: { "application/json": { schema: resolver(UpdateLocationBodySchema) } } },
  description: routeText({
    context: "A tenant_admin or store_admin renames a Location or changes its address, phone or timezone.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server changes the fields sent. A field left out is kept, and address or phone sent as null is cleared.",
      "A countryId sent here is ignored: a Location's Country is fixed when it is added.",
      "An archived Location, or one of another Tenant, is 404.",
    ],
    example: [
      bash(
        `curl -X PATCH "${EXAMPLE_BASE_URL}/locations/$LOCATION_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"phone":"+1 555 0100"}\'',
      ),
      json(`{ "data": ${EXAMPLE_LOCATION}, "error": null }`),
    ],
  }),
  responses: {
    200: jsonResponse("The edited Location.", envelope(LocationSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
