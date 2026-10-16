import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { FaqBodySchema, FaqSchema } from "@repo/contracts/amelie";
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

export const updateFaqDoc = describeRoute({
  tags: ["faqs"],
  summary: "Change an FAQ",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "faqId", required: true, description: "The id of the FAQ.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(FaqBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin changes the question, the answer or the category of one FAQ. The dashboard sends the whole FAQ.",
    steps: [
      "The server checks that the signed-in Person is a tenant_admin or store_admin of this Tenant. A store_staff member gets 403.",
      "The server looks for the FAQ in this Tenant. If it finds none, the answer is 404.",
      "If a categoryId is given, it must be a category of this Tenant. null moves the FAQ to General.",
      "If a locationId is given, it must be an active Location of this Tenant and the FAQ is shown only there. null (or left out) makes it show at every Location.",
      "The server saves the FAQ and returns it.",
    ],
    example: [
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/faqs/$FAQ_ID?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"categoryId":null,"question":"Do you take cards?","answer":"Yes, and Apple Pay."}\'',
      ),
      json('{ "data": { "id": "…", "categoryId": null, "category": null, "locationId": null, "question": "Do you take cards?", "answer": "Yes, and Apple Pay." }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved FAQ.", envelope(FaqSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
