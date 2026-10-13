import { describeRoute } from "hono-openapi";
import { MenuItemImagesSchema } from "@repo/contracts/amelie";
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

export const addMenuItemImageDoc = describeRoute({
  tags: ["menu"],
  summary: "Add a menu item image",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: {
    required: true,
    content: {
      "multipart/form-data": {
        schema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: { type: "string", format: "binary" },
              description: "One or more JPEG, PNG or WebP images, each up to 10 MB. At most 10 photos per item in total.",
            },
          },
          required: ["files"],
        },
      },
    },
  },
  description: routeText({
    context:
      "An owner or manager adds photos to a Menu item in one request. The item can have up to 10. The first photo is the one cards show.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server checks each file: JPEG, PNG or WebP, up to 10 MB, and that existing photos plus this batch stay at 10 or fewer.",
      "The server stores the objects and returns the new images in order.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID/images?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN" -F "files=@latte.jpg" -F "files=@latte-alt.png"`,
      ),
      json(
        '{ "data": [{ "id": "…", "name": "latte.jpg", "contentType": "image/jpeg", "size": 48211, "sortOrder": 0 }, { "id": "…", "name": "latte-alt.png", "contentType": "image/png", "size": 22001, "sortOrder": 1 }], "error": null }',
      ),
    ],
  }),
  responses: {
    201: jsonResponse("The new images.", envelope(MenuItemImagesSchema)),
    ...errorResponses(400, 401, 403, 404, 413),
  },
});
