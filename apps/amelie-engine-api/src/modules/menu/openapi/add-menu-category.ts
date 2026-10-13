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

export const addMenuCategoryDoc = describeRoute({
  tags: ["menu"],
  summary: "Add a menu category",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(MenuCategoryBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager adds a menu category, such as Coffee or Pastries. A category can have a short note, such as: Gluten-free bread +2.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server checks the name and the note. The name has up to 80 characters.",
      "The server saves the category at the end of the order and returns it.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/menu/categories?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"name":"Coffee","note":null}\'',
      ),
      json('{ "data": { "id": "…", "name": "Coffee", "note": null }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved category.", envelope(MenuCategoryRefSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
