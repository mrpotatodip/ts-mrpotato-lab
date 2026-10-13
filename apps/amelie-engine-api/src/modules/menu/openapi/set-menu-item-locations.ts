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

export const setMenuItemLocationsDoc = describeRoute({
  tags: ["menu"],
  summary: "Set where a menu item is sold",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "itemId", required: true, description: "The id of the menu item.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuItemLocationsBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager marks an item sold out at some Locations, or sold only at chosen Locations. With availableAtAllLocations true, locationIds are the Locations where it is sold out. With it false, locationIds are the only Locations that sell it, and a Location opened later does not.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server looks for the item and the Locations in this Tenant. If it finds none, or a Location is archived or belongs to another Tenant, the answer is 404.",
      "The server replaces the item's flag and Location list together and returns the item.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/items/$ITEM_ID/locations?tenantId=${EXAMPLE_TENANT_ID}" \\`,
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
