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

export const reorderMenuCategoriesDoc = describeRoute({
  tags: ["menu"],
  summary: "Put the menu categories in order",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuOrderBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin moves a category up or down. The dashboard sends all category ids in the new order.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server checks that the ids are exactly the categories of this Tenant. A missing, repeated or foreign id gives 400.",
      "The server saves the new order in one transaction and returns the menu.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/categories/order?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"ids":["$PASTRIES_ID","$COFFEE_ID"]}\'',
      ),
      json('{ "data": [{ "id": "…", "name": "Pastries", "note": null, "items": [] }], "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The categories, in the new order.", envelope(MenuCategoriesSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
