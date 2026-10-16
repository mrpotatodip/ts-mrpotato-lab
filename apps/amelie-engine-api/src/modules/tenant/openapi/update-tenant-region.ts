import { describeRoute, resolver } from "hono-openapi";
import { TenantSchema, UpdateTenantRegionBodySchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  STAFF_SECURITY,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const updateTenantRegionDoc = describeRoute({
  tags: ["tenants"],
  summary: "Change the country and currency of a Tenant",
  security: STAFF_SECURITY,
  requestBody: { required: true, content: { "application/json": { schema: resolver(UpdateTenantRegionBodySchema) } } },
  description: routeText({
    context:
      "A tenant_admin or store_admin moves the business to another country or currency. Prices keep their numbers: changing the currency relabels them, it does not convert them.",
    steps: [
      "The server checks that the signed-in Person is a team member of this Tenant. If not, the answer is 404.",
      "The server checks that their Role can edit. A store_staff member gets 403.",
      "The server checks that the country and the currency are in the lists the dashboard offers. If not, the answer is 400.",
      "The server saves both on the Tenant's first open Country and returns the Tenant. If the cafe already has another Country with that country, the answer is 409.",
    ],
    example: [
      "A cafe in Manila switches to pesos. A price of 4.75 USD becomes 4.75 PHP:",
      bash(
        `curl -X PATCH ${EXAMPLE_BASE_URL}/tenants/${EXAMPLE_TENANT_ID}/region \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"country":"PH","currency":"PHP"}\'',
      ),
      json(
        `{\n  "data": { "id": "${EXAMPLE_TENANT_ID}", "name": "Sorella Cafe", "slug": "sorella-cafe", "timezone": "Asia/Manila", "country": "PH", "currency": "PHP", "allowedOrigins": [], "role": "tenant_admin", "powers": ["company:profile:region:update"] },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant with its new region.", envelope(TenantSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
