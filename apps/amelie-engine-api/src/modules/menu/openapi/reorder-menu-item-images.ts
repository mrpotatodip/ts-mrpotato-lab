import { describeRoute, resolver } from "hono-openapi";
import { MenuItemImagesSchema, MenuOrderBodySchema } from "@repo/contracts/amelie";
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

export const reorderMenuItemImagesDoc = describeRoute({
  tags: ["menu"],
  summary: "Put a menu item's images in order",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuOrderBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin rearranges the photos of a Menu item. The first photo is the cover. The dashboard sends every image id of the item in the new order.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server looks for the item in this Tenant. If it finds none, the answer is 404.",
      "The server checks that the ids are exactly the images of this item. A missing, repeated or foreign id gives 400.",
      "The server saves the new order and returns the images.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID/images/order?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"ids":["$IMAGE_B","$IMAGE_A"]}\'',
      ),
      json(
        '{ "data": [{ "id": "…", "name": "latte-alt.png", "contentType": "image/png", "size": 22001, "sortOrder": 0 }, { "id": "…", "name": "latte.jpg", "contentType": "image/jpeg", "size": 48211, "sortOrder": 1 }], "error": null }',
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The images in the new order.", envelope(MenuItemImagesSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
