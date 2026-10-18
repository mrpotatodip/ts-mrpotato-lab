import { describeRoute, resolver } from "hono-openapi";
import { MenuItemLocationsBodySchema, MenuItemSchema } from "@repo/contracts/amelie";
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

export const setMenuItemSoldOutLocationsDoc = describeRoute({
  tags: ["menu"],
  summary: "Mark a menu item sold out at some Locations",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuItemLocationsBodySchema) } } },
  description: routeText({
    context:
      "A Person whose Role has `store:menu:availability:update` marks an item sold out at a Location, or back on, from the store Menu. It takes the same body as the Master menu route, so availableAtAllLocations true with locationIds lists the Locations where the item is sold out.",
    steps: [
      "The server checks that the signed-in Person's Role has `store:menu:availability:update` in this Tenant. Without it the answer is 403.",
      "The server looks for the item and the Locations in this Tenant. If it finds none, or a Location is archived or belongs to another Tenant, the answer is 404.",
      "The server replaces the item's flag and Location list together and returns the item.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID/sold-out-locations?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"availableAtAllLocations":true,"locationIds":["$DOWNTOWN_ID"]}\'',
      ),
      json('{ "data": { "id": "…", "name": "Iced Latte", "description": null, "price": "5.00", "currency": "USD", "variants": null, "isAvailable": true, "availableAtAllLocations": true, "locationIds": ["…"], "coverPath": null, "images": [], "dietaryTags": [] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved item.", envelope(MenuItemSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
