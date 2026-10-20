import { describeRoute } from "hono-openapi";
import { LocationArchivePreviewSchema } from "@repo/contracts/amelie";
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

export const archiveLocationPreviewDoc = describeRoute({
  tags: ["locations"],
  summary: "Preview archiving a Location",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "Before confirming an archive, the dashboard asks which team members would be left with no open Location. Archiving is never blocked by a binding; this only names them. Nothing is changed.",
    steps: [
      "The server checks that the signed-in Person may archive Locations. A store_staff member gets 403.",
      "The server answers 404 when the Location is not an open Location of this Tenant.",
      "The server lists the bound members (never the tenant_admin) whose only open Location is this one, with name and email. Members with no bindings, or who keep another open Location, are not listed.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/locations/$LOCATION_ID/archive-preview?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN"',
      ),
      json(
        '{ "data": { "id": "…", "membersWithoutLocation": [{ "partyId": "…", "name": "Priya Shah", "email": "priya@example.com" }] }, "error": null }',
      ),
    ],
  }),
  responses: {
    200: jsonResponse(
      "The Location's id and the members an archive would leave with no open Location.",
      envelope(LocationArchivePreviewSchema),
    ),
    ...errorResponses(400, 401, 403, 404),
  },
});
