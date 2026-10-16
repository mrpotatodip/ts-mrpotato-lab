import { describeRoute } from "hono-openapi";
import { FaqDeletedSchema } from "@repo/contracts/amelie";
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

export const deleteFaqCategoryDoc = describeRoute({
  tags: ["faqs"],
  summary: "Delete an FAQ category",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "categoryId", required: true, description: "The id of the FAQ category.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "A tenant_admin or store_admin removes a category. Its FAQs are not deleted. They move to General.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server deletes the category of this Tenant. If there is none, the answer is 404.",
      "The FAQs of the category now have no category. They show as General.",
      "The server returns the id.",
    ],
    example: [
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/faqs/categories/$CATEGORY_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the deleted category.", envelope(FaqDeletedSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
