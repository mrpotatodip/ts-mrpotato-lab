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

export const setMenuItemImageCoverDoc = describeRoute({
  tags: ["menu"],
  summary: "Set a menu item image as the cover",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
    { in: "path", name: "imageId", required: true, description: "The id of the Menu item image.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context: "An owner or manager makes one photo the cover of a Menu item. Cards show that photo.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server puts this Tenant's image first on this item. If there is none, the answer is 404.",
      "The server returns the images in the new order.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID/images/$IMAGE_ID/cover?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json(
        '{ "data": [{ "id": "…", "name": "latte-alt.png", "contentType": "image/png", "size": 22001, "sortOrder": 0 }, { "id": "…", "name": "latte.jpg", "contentType": "image/jpeg", "size": 48211, "sortOrder": 1 }], "error": null }',
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The images in cover order.", envelope(MenuItemImagesSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
