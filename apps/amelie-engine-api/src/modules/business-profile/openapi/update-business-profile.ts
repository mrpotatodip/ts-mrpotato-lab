import { describeRoute } from "hono-openapi";
import { BusinessProfileSchema, UpdateBusinessProfileBodySchema } from "@repo/contracts/amelie";
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
import { resolver } from "hono-openapi";

export const updateBusinessProfileDoc = describeRoute({
  tags: ["business-profile"],
  summary: "Change the Business profile",
  security: STAFF_SECURITY,
  parameters: [TENANT_ID_QUERY_PARAMETER],
  requestBody: { required: true, content: { "application/json": { schema: resolver(UpdateBusinessProfileBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager changes the contact facts of the Tenant. The dashboard sends the whole profile. A field that is null is cleared.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server checks the body. The email must look like an email. The website must be a full URL.",
      "The server saves the profile. It creates the profile on the first save.",
      "The server returns the saved profile.",
    ],
    example: [
      "Set a phone number and clear the address:",
      bash(
        `curl -X PUT "${EXAMPLE_BASE_URL}/business-profile?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"description":null,"websiteUrl":null,"phone":"845-871-2010","email":null,"address":null}\'',
      ),
      json('{ "data": { "description": null, "websiteUrl": null, "phone": "845-871-2010", "email": null, "address": null }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The saved profile.", envelope(BusinessProfileSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
