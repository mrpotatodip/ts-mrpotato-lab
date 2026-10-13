import { describeRoute, resolver } from "hono-openapi";
import { MenuCategoryBodySchema, MenuCategorySchema } from "@repo/contracts/amelie";
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

const MenuCategoryRefSchema = MenuCategorySchema.omit({ items: true });

export const updateMenuCategoryDoc = describeRoute({
  tags: ["menu"],
  summary: "Change a menu category",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "categoryId", required: true, description: "The id of the menu category.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuCategoryBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager changes the name or the note of a category. The items stay in it.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server looks for the category in this Tenant. If it finds none, the answer is 404.",
      "The server saves the name and the note and returns the category.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/menu/categories/$CATEGORY_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"name":"Pastries","note":"Baked daily"}\'',
      ),
      json('{ "data": { "id": "…", "name": "Pastries", "note": "Baked daily" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved category.", envelope(MenuCategoryRefSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
