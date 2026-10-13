import { describeRoute } from "hono-openapi";
import { ImportListSchema } from "@repo/contracts/amelie";
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

export const listImportsDoc = describeRoute({
  tags: ["imports"],
  summary: "List the menu imports",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
  ],
  description: routeText({
    context:
      "The dashboard lists the uploads of the Tenant, newest first, with their status and how many drafts wait for review.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server reads the newest 20 Imports of this Tenant.",
      "For each Import, the server counts the drafts that are pending, approved and discarded.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/imports?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": [{ "id": "…", "status": "ready", "error": null, "files": [{ "name": "menu.jpg", "contentType": "image/jpeg", "size": 482113 }], "createdAt": "2026-10-05T18:00:00.000Z", "finishedAt": "2026-10-05T18:00:20.000Z", "pendingCount": 42, "approvedCount": 0, "discardedCount": 0 }], "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The Imports, newest first.", envelope(ImportListSchema)),
    ...errorResponses(400, 401, 404),
  },
});
