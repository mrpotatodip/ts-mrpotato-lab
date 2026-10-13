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

export const getImportDoc = describeRoute({
  tags: ["imports"],
  summary: "Get one menu import with its drafts",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "importId", required: true, description: "The id of the Import.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "A team member opens an Import to review it. A draft that the model was unsure about has a reviewNote, and the dashboard shows a needs-a-look badge.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server looks for the Import in this Tenant. If it finds none, the answer is 404.",
      "The server returns the Import and its drafts, in the order they were read. Each draft has a kind, its data, the file it came from, a status and an optional reviewNote.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/imports/$IMPORT_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…", "status": "ready", "drafts": [{ "id": "…", "kind": "menu_item", "status": "pending", "sourceFile": "menu.jpg", "reviewNote": "The price was not clear.", "data": { "categoryName": "Coffee", "name": "Latte", "description": null, "price": "4.75", "variants": null, "dietaryTags": [] } }] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The Import and its drafts.", envelope(ImportDetailSchema)),
    ...errorResponses(400, 401, 404),
  },
});
