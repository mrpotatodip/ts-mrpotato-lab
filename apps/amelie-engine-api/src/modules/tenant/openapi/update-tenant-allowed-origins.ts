import { describeRoute, resolver } from "hono-openapi";
import { TenantSchema, UpdateTenantAllowedOriginsBodySchema } from "@repo/contracts/amelie";
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

export const updateTenantAllowedOriginsDoc = describeRoute({
  tags: ["tenants"],
  summary: "Replace the websites that may embed the Customer chat",
  security: STAFF_SECURITY,
  requestBody: {
    required: true,
    content: { "application/json": { schema: resolver(UpdateTenantAllowedOriginsBodySchema) } },
  },
  description: routeText({
    context:
      "A tenant_admin or store_admin lists the cafe websites that may iframe the Customer chat. The list replaces whatever was stored. An empty list is allowed: the widget cannot iframe, and chat on Amelie still works.",
    steps: [
      "The server checks that the signed-in Person is a team member of this Tenant. If not, the answer is 404.",
      "The server checks that their Role can edit. A store_staff member gets 403.",
      "Each pasted value must be an http or https URL. Paths drop to the origin. Duplicates drop, keeping the first. Other schemes, `*`, and more than 20 unique origins fail the whole write with 400.",
      "The server stores the unique origins in the order they were saved and returns the Tenant.",
    ],
    example: [
      "A cafe allows its site, including a path that becomes the origin:",
      bash(
        `curl -X PUT ${EXAMPLE_BASE_URL}/tenants/${EXAMPLE_TENANT_ID}/allowed-origins \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"allowedOrigins":["https://sorellacafe.com/menu"]}\'',
      ),
      json(
        `{\n  "data": { "id": "${EXAMPLE_TENANT_ID}", "name": "Sorella Cafe", "slug": "sorella-cafe", "timezone": "Europe/Rome", "country": "IT", "currency": "EUR", "allowedOrigins": ["https://sorellacafe.com"], "role": "tenant_admin", "powers": ["integration:widget:origins:update"] },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant with its new Allowed origins.", envelope(TenantSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
