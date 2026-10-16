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

export const addMenuItemDoc = describeRoute({
  tags: ["menu"],
  summary: "Add a menu item",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuItemBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin adds a dish or a drink, with its price, Variants (such as sizes) and Dietary tags. The assistant then tells Customers about it.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server checks the item. A price has up to two decimals. An item with Variants needs no price: its price is the lowest Variant price. Variant names must differ.",
      "The price and Variants are for the Country named by countryId, an open Country of this Tenant (404 otherwise). countryId is required (400) when the Tenant has two or more open Countries; with one it is used. isSold, when sent, says whether the item is sold in that Country.",
      "The category must be a category of this Tenant. Every Dietary tag must be on the shared list.",
      "The server saves the item and its tags together and returns the item.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/menu/items?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"categoryId":"$CATEGORY_ID","name":"Muffin","description":null,"price":"4.00","variants":null,"isAvailable":true,"dietaryTags":["vegetarian"]}\'',
      ),
      json('{ "data": { "id": "…", "name": "Muffin", "description": null, "price": "4.00", "currency": "USD", "variants": null, "isAvailable": true, "coverPath": null, "images": [], "dietaryTags": ["vegetarian"] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved item.", envelope(MenuItemSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
