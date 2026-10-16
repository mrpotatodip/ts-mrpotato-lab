import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { FaqCategoryBodySchema, FaqCategorySchema } from "@repo/contracts/amelie";
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

export const renameFaqCategoryDoc = describeRoute({
  tags: ["faqs"],
  summary: "Rename an FAQ category",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "categoryId", required: true, description: "The id of the FAQ category.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(FaqCategoryBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin gives a category a new name. Its FAQs stay in it.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server looks for the category in this Tenant. If it finds none, the answer is 404.",
      "If another category has the same name, ignoring case, the answer is 409.",
      "The server saves the name and returns the category.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/faqs/categories/$CATEGORY_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"name":"Parking & access"}\'',
      ),
      json('{ "data": { "id": "…", "name": "Parking & access" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The renamed category.", envelope(FaqCategorySchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
