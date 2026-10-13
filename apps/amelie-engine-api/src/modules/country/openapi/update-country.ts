import { describeRoute, resolver } from "hono-openapi";
import { CountrySchema, UpdateCountryBodySchema } from "@repo/contracts/amelie";
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

export const updateCountryDoc = describeRoute({
  tags: ["countries"],
  summary: "Change a Country's Currency",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  requestBody: { required: true, content: { "application/json": { schema: resolver(UpdateCountryBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager changes the Currency a Country is priced in. The country itself is its identity and cannot change.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server saves the new Currency. Prices keep their numbers: nothing is converted.",
      "An archived Country, or one of another Tenant, is 404.",
    ],
    example: [
      bash(
        `curl -X PATCH "${EXAMPLE_BASE_URL}/countries/$COUNTRY_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"currency":"USD"}\'',
      ),
      json('{ "data": { "id": "…", "country": "CA", "currency": "USD", "archivedAt": null }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The edited Country.", envelope(CountrySchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
