import { describeRoute } from "hono-openapi";
import {
  LocationArchivedSchema,
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

export const archiveLocationDoc = describeRoute({
  tags: ["locations"],
  summary: "Archive a Location",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "A tenant_admin or store_admin closes a Location for good. It is archived, never deleted, and the widget and the assistant stop offering it.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server refuses with 409 when this is the last active Location of the Tenant.",
      "The server marks the Location archived and returns its id with the menu items that were sold only there and are now sold nowhere.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/locations/$LOCATION_ID/archive?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json('{ "data": { "id": "…", "unsoldMenuItems": [{ "id": "…", "name": "Airport Sandwich" }] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The archived Location's id and the items it left unsold.", envelope(LocationArchivedSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
