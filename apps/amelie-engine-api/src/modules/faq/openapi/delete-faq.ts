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

export const deleteFaqDoc = describeRoute({
  tags: ["faqs"],
  summary: "Delete an FAQ",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "faqId", required: true, description: "The id of the FAQ.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "An owner or manager removes an FAQ. The assistant no longer uses it.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server deletes the FAQ of this Tenant. If there is none, the answer is 404.",
      "The server returns the id.",
    ],
    example: [
      bash(
        `curl -X DELETE "${EXAMPLE_BASE_URL}/faqs/$FAQ_ID?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`,
      ),
      json('{ "data": { "id": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The id of the deleted FAQ.", envelope(FaqDeletedSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
