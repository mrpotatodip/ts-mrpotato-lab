import { describeRoute } from "hono-openapi";
import { MenuDeletedSchema } from "@repo/contracts/amelie";
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

export const deleteMenuCategoryDoc = describeRoute({
  tags: ["menu"],
  summary: "Delete a menu category",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "categoryId", required: true, description: "The id of the menu category.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "An owner or manager removes a category. Its items and their photos are deleted with it.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server deletes the category of this Tenant. If there is none, the answer is 404.",
      "The items of the category and their stored photos are deleted too.",
      "The server returns the id.",
    ],
    example: [
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/menu/categories/$CATEGORY_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the deleted category.", envelope(MenuDeletedSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
