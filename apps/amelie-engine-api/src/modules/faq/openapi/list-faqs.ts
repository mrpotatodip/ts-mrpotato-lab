import { describeRoute } from "hono-openapi";
import { FaqListSchema } from "@repo/contracts/amelie";
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

export const listFaqsDoc = describeRoute({
  tags: ["faqs"],
  summary: "List FAQs and categories",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    {
      in: "query",
      name: "locationId",
      required: false,
      description: "Show the Tenant-wide FAQs plus this Location's own. Left out, every FAQ comes back with its locationId.",
      schema: { type: "string", format: "uuid" },
    },
  ],
  description: routeText({
    context:
      "The dashboard shows every FAQ of the Tenant, with the category each sits in. The assistant answers Customers from these FAQs.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server reads the categories of this Tenant in their order.",
      "The server reads the FAQs. FAQs with no category (General) come first.",
    ],
    example: [
      bash(
        `curl "${EXAMPLE_BASE_URL}/faqs?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "categories": [{ "id": "…", "name": "Parking" }], "faqs": [{ "id": "…", "categoryId": null, "category": null, "locationId": null, "question": "Do you take cards?", "answer": "Yes." }] }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The categories and the FAQs.", envelope(FaqListSchema)),
    ...errorResponses(400, 401, 404),
  },
});
