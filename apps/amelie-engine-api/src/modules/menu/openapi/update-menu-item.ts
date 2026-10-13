import { describeRoute, resolver } from "hono-openapi";
import { MenuItemBodySchema, MenuItemSchema } from "@repo/contracts/amelie";
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

export const updateMenuItemDoc = describeRoute({
  tags: ["menu"],
  summary: "Change a menu item",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuItemBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager changes an item: its name, price, Variants, Dietary tags, category, or whether it is available. An item that is not available stays on the menu, and the assistant says it is not available.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server looks for the item in this Tenant. If it finds none, the answer is 404.",
      "The server checks the item as for a new item. The dashboard sends the whole item.",
      "The price and Variants are saved for the Country named by countryId (required with two or more open Countries, else the only one); other Countries keep their prices. isSold, when sent, sets the sold-here flag there. With a countryId, price and Variants may both be left out (null) to change only the item's own fields: that Country's price is kept.",
      "The server saves the item and its tags together and returns the item.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"categoryId":"$CATEGORY_ID","name":"Muffin","description":null,"price":"4.50","variants":null,"isAvailable":false,"dietaryTags":[]}\'',
      ),
      json('{ "data": { "id": "…", "name": "Muffin", "description": null, "price": "4.50", "currency": "USD", "variants": null, "isAvailable": false, "availableAtAllLocations": true, "locationIds": [], "imageUrl": null, "dietaryTags": [] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved item.", envelope(MenuItemSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
