import { describeRoute } from "hono-openapi";
import { MenuEditorSchema } from "@repo/contracts/amelie";
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

export const getMenuDoc = describeRoute({
  tags: ["menu"],
  summary: "Get the menu",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    {
      in: "query",
      name: "locationId",
      required: false,
      description: "Show only what is sold at this Location. Left out, the whole Tenant menu comes back.",
      schema: { type: "string", format: "uuid" },
    },
    {
      in: "query",
      name: "countryId",
      required: false,
      description:
        "Show the menu of this Country: every item with its price, Variants and currency there, and isSold. An item with no price there comes back with isSold false. An unknown, archived or foreign Country is 404.",
      schema: { type: "string", format: "uuid" },
    },
  ],
  description: routeText({
    context:
      "The dashboard shows the whole menu of the Tenant: categories, items, Variants and Dietary tags. It also gets the shared list of Dietary tags to choose from.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server reads the categories and their items, in the order the Tenant set.",
      "If a locationId is given, the server keeps only the items sold at that Location. Without it, every item comes back, each with where it is sold.",
      "The server adds the shared list of Dietary tags.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/menu?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "categories": [{ "id": "…", "name": "Coffee", "note": null, "items": [{ "id": "…", "name": "Latte", "description": null, "price": "4.75", "currency": "USD", "variants": [{ "name": "Small", "price": "4.75" }, { "name": "Large", "price": "6.25" }], "isAvailable": true, "availableAtAllLocations": true, "locationIds": [], "imageUrl": null, "images": [], "dietaryTags": ["vegetarian"] }] }], "dietaryTags": [{ "slug": "vegetarian", "label": "Vegetarian" }] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The menu and the Dietary tags.", envelope(MenuEditorSchema)),
    ...errorResponses(400, 401, 404),
  },
});
