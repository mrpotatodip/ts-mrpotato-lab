import { describeRoute } from "hono-openapi";
import { CountryArchivedSchema } from "@repo/contracts/amelie";
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

export const archiveCountryDoc = describeRoute({
  tags: ["countries"],
  summary: "Archive a Country",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "A tenant_admin or store_admin stops selling in a country. It is archived, never deleted, and its prices are kept in case the country is added again.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server refuses with 409 when this is the last open Country of the Tenant.",
      "The server refuses with 409 when the Country still has open Locations. Archive those first.",
      "The server marks the Country archived and returns its id.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/countries/$COUNTRY_ID/archive?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json('{ "data": { "id": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The archived Country's id.", envelope(CountryArchivedSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
