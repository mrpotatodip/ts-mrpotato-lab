import { describeRoute, resolver } from "hono-openapi";
import {
  CreateLocationBodySchema,
  LocationSchema,
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

export const createLocationDoc = describeRoute({
  tags: ["locations"],
  summary: "Add a Location",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  requestBody: { required: true, content: { "application/json": { schema: resolver(CreateLocationBodySchema) } } },
  description: routeText({
    context: "An owner or manager adds a second place the cafe operates from, such as Airport.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server makes a slug from the name, and adds -2, -3 if the Tenant already used it.",
      "The Location joins the Country named by countryId, which must be an open Country of this Tenant (404 otherwise). countryId is required (400) when the Tenant has two or more open Countries; with one, it is used. A Location's Country never changes afterwards.",
      "A Location sent without a timezone gets the timezone of the last Location created in its Country, else the Tenant's timezone.",
      "The server saves the Location and returns it.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/locations?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"name":"Airport"}\'',
      ),
      json(`{ "data": ${EXAMPLE_LOCATION}, "error": null }`),
    ],
  }),
  responses: {
    201: jsonResponse("The new Location.", envelope(LocationSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
