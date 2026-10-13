import { describeRoute } from "hono-openapi";
import { ImportDetailSchema } from "@repo/contracts/amelie";
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

export const approveAllImportDraftsDoc = describeRoute({
  tags: ["imports"],
  summary: "Approve all pending drafts",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "importId", required: true, description: "The id of the Import.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "An owner or manager trusts the reading and approves every draft that is still pending. Drafts that were discarded stay discarded.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server looks for the Import in this Tenant. If it finds none, the answer is 404. A published Import gives 409.",
      "The server marks every pending draft of the Import as approved.",
      "The server returns the Import with its drafts.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/imports/$IMPORT_ID/approve-all?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…", "status": "ready", "pendingCount": 0, "approvedCount": 42, "discardedCount": 0, "drafts": [] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The Import with its drafts.", envelope(ImportDetailSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
