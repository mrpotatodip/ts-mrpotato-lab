import { describeRoute } from "hono-openapi";
import { BusinessProfileSchema } from "@repo/contracts/amelie";
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

export const getBusinessProfileDoc = describeRoute({
  tags: ["business-profile"],
  summary: "Get the Business profile",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  description: routeText({
    context:
      "The Business profile holds the contact facts of a Tenant: description, website, phone, email and address. The assistant tells these to Customers. The dashboard shows them in a form.",
    steps: [
      "The server checks that the signed-in Person has a role in this Tenant.",
      "The server reads the profile of this Tenant.",
      "If the Tenant has not set a profile, every field is null.",
    ],
    example: [
      "Read the profile of one Tenant:",
      bash(`curl "${EXAMPLE_BASE_URL}/business-profile?tenantId=${EXAMPLE_TENANT_ID}" -H "Authorization: Bearer $TOKEN"`),
      json(
        '{\n  "data": { "description": "Cafe in Fishkill", "websiteUrl": "https://sorellacafe.com", "phone": "845-871-2010", "email": null, "address": null },\n  "error": null\n}',
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The profile. A field the Tenant has not set is null.", envelope(BusinessProfileSchema)),
    ...errorResponses(400, 401, 404),
  },
});
