import { describeRoute, resolver } from "hono-openapi";
import { ImportDraftSchema, UpdateImportDraftBodySchema } from "@repo/contracts/amelie";
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

export const updateImportDraftDoc = describeRoute({
  tags: ["imports"],
  summary: "Edit, approve or discard a draft",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "importId", required: true, description: "The id of the Import.", schema: { type: "string", format: "uuid" } },
    { in: "path", name: "draftId", required: true, description: "The id of the draft.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(UpdateImportDraftBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin fixes a draft, approves it, or discards it. Only approved drafts go live when the Import is published.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server looks for the draft in this Import and Tenant. If it finds none, the answer is 404.",
      "If the body has data, the server checks it with the rules of the draft kind. A bad value gives 400.",
      "The server saves the change. An Import that is already published cannot change: the answer is 409.",
      "The server returns the draft.",
    ],
    example: [
      bash(
        `curl -X PATCH "${EXAMPLE_BASE_URL}/imports/$IMPORT_ID/drafts/$DRAFT_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"status":"approved"}\'',
      ),
      json('{ "data": { "id": "…", "kind": "menu_item", "status": "approved", "sourceFile": "menu.jpg", "reviewNote": null, "data": { "categoryName": "Coffee", "name": "Latte", "description": null, "price": "4.75", "variants": null, "dietaryTags": [] } }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved draft.", envelope(ImportDraftSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
