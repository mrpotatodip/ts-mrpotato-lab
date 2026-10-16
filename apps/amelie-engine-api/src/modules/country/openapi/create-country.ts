import { describeRoute, resolver } from "hono-openapi";
import { CountrySchema, CreateCountryBodySchema } from "@repo/contracts/amelie";
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

const EXAMPLE_COUNTRY = '{ "id": "…", "country": "CA", "currency": "CAD", "archivedAt": null }';

export const createCountryDoc = describeRoute({
  tags: ["countries"],
  summary: "Add a Country",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  requestBody: { required: true, content: { "application/json": { schema: resolver(CreateCountryBodySchema) } } },
  description: routeText({
    context: "A tenant_admin or store_admin starts selling in another country, such as Canada in CAD.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server answers 409 when the Tenant already sells in that country.",
      "If the Tenant sold in that country before and archived it, that Country is restored with its prices, and gets the Currency sent. Otherwise a new Country is saved.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/countries?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"country":"CA","currency":"CAD"}\'',
      ),
      json(`{ "data": ${EXAMPLE_COUNTRY}, "error": null }`),
    ],
  }),
  responses: {
    201: jsonResponse("The new or restored Country.", envelope(CountrySchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
