import { describeRoute } from "hono-openapi";
import { CountryListSchema } from "@repo/contracts/amelie";
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

export const listCountriesDoc = describeRoute({
  tags: ["countries"],
  summary: "List Countries",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context: "The dashboard lists the countries the Tenant sells in, so a team member can switch between them or manage them.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server reads every Country of this Tenant, oldest first. Archived ones carry an archivedAt date.",
    ],
    example: [
      bash(`curl "${EXAMPLE_BASE_URL}/countries?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json(`{ "data": [${EXAMPLE_COUNTRY}], "error": null }`),
    ],
  }),
  responses: {
    200: jsonResponse("The Countries.", envelope(CountryListSchema)),
    ...errorResponses(400, 401, 404),
  },
});
