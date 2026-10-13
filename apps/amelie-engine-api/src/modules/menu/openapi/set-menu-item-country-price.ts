import { describeRoute, resolver } from "hono-openapi";
import { MenuItemSchema, SetMenuItemCountryPriceBodySchema } from "@repo/contracts/amelie";
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

export const setMenuItemCountryPriceDoc = describeRoute({
  tags: ["menu"],
  summary: "Set a menu item's price and sold-here flag in a Country",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
    { in: "path", name: "countryId", required: true, description: "The id of an open Country of the Tenant.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(SetMenuItemCountryPriceBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager prices an item in one country, such as Latte at 6.25 in Canada, or stops selling it there. Other countries are untouched.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server looks for the item and the Country in this Tenant. An unknown item, or a Country that is archived or belongs to another Tenant, is 404.",
      "With a price or Variants in the body, the server saves them for that Country (with Variants the price is the lowest Variant). With neither, only isSold changes and the price is kept, so turning sold-here off and on again loses nothing.",
      "Selling an item in a Country where it has no price yet, without sending one, is 400.",
      "The server returns the item as that Country sees it, with its currency and isSold.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID/countries/$COUNTRY_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"isSold":true,"price":"6.25"}\'',
      ),
      json('{ "data": { "id": "…", "name": "Latte", "description": null, "price": "6.25", "currency": "CAD", "variants": null, "isAvailable": true, "availableAtAllLocations": true, "locationIds": [], "isSold": true, "imageUrl": null, "dietaryTags": [] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The item in that Country.", envelope(MenuItemSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
