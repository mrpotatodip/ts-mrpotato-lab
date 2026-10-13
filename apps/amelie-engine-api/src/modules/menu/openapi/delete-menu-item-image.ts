import { describeRoute } from "hono-openapi";
import { MenuDeletedSchema } from "@repo/contracts/amelie";
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

export const deleteMenuItemImageDoc = describeRoute({
  tags: ["menu"],
  summary: "Delete a menu item image",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
    { in: "path", name: "imageId", required: true, description: "The id of the Menu item image.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context: "An owner or manager removes one photo from a Menu item. The stored object is deleted with the row.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server deletes this Tenant's image on this item. If there is none, the answer is 404.",
      "The server returns the id.",
    ],
    example: [
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID/images/$IMAGE_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the deleted image.", envelope(MenuDeletedSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
