import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { MenuCategorySchema, MenuOrderBodySchema } from "@repo/contracts/amelie";
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

const MenuCategoriesSchema = z.array(MenuCategorySchema);

export const reorderMenuItemsDoc = describeRoute({
  tags: ["menu"],
  summary: "Put the items of a category in order",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "categoryId", required: true, description: "The id of the menu category.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuOrderBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin moves an item up or down inside its category. The dashboard sends all item ids of the category in the new order.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server looks for the category in this Tenant. If it finds none, the answer is 404.",
      "The server checks that the ids are exactly the items of this category. A missing, repeated or foreign id gives 400.",
      "The server saves the new order in one transaction and returns the menu.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/categories/$CATEGORY_ID/items/order?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"ids":["$ITEM_B","$ITEM_A"]}\'',
      ),
      json('{ "data": [{ "id": "…", "name": "Coffee", "note": null, "items": [] }], "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The categories, with the items in the new order.", envelope(MenuCategoriesSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
