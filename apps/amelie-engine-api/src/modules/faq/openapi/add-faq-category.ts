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

export const addFaqCategoryDoc = describeRoute({
  tags: ["faqs"],
  summary: "Add an FAQ category",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(FaqCategoryBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin adds a category, such as Parking or Kids. FAQs can then be grouped in it.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server checks the name. It has up to 60 characters.",
      "If a category with the same name exists, ignoring case, the answer is 409.",
      "The server saves the category at the end of the order and returns it.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/faqs/categories?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"name":"Parking"}\'',
      ),
      json('{ "data": { "id": "…", "name": "Parking" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved category.", envelope(FaqCategorySchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
