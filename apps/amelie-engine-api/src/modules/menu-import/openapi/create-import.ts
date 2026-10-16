import { describeRoute } from "hono-openapi";
import { ImportSummarySchema } from "@repo/contracts/amelie";
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

export const createImportDoc = describeRoute({
  tags: ["imports"],
  summary: "Upload a menu",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
  ],
  requestBody: {
    required: true,
    content: {
      "multipart/form-data": {
        schema: {
          type: "object",
          properties: { files: { type: "array", items: { type: "string", format: "binary" }, description: "One PDF, or up to 10 images." } },
          required: ["files"],
        },
      },
    },
  },
  description: routeText({
    context:
      "A tenant_admin or store_admin has a menu as a PDF or as photos. They upload it, and Amelie reads it. The result is a set of drafts to review. Nothing goes live from an upload.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server checks the files. Send one PDF, or up to 10 images (JPEG, PNG or WebP), each up to 10 MB. A PDF and an image together give 400.",
      "The server saves the files under imports/<tenant id>/<import id>/ and creates the Import with the status `running`.",
      "The server puts one message on the queue and returns the Import. It does not wait for the reading.",
      "Later, the queue consumer reads each file with the model and writes one draft for each category, item, weekly hours day and profile fact that it finds. The Import then becomes `ready`, or `failed` with the reason.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/imports?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" \\',
        '  -F "files=@menu.jpg"',
      ),
      json('{ "data": { "id": "…", "status": "running", "error": null, "files": [{ "name": "menu.jpg", "contentType": "image/jpeg", "size": 482113 }], "createdAt": "2026-10-05T18:00:00.000Z", "finishedAt": null, "pendingCount": 0, "approvedCount": 0, "discardedCount": 0 }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The new Import. Poll GET /imports/{importId} until it is ready or failed.", envelope(ImportSummarySchema)),
    ...errorResponses(400, 401, 403, 404, 413),
  },
});
