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
      "An owner or manager names the websites that may iframe the Customer chat. Pasted site URLs become origins. The list replaces whatever was stored. An empty list is allowed: the cafe site cannot iframe, and the Amelie chat page still works.",
    steps: [
      "The server checks that the signed-in Person is a team member of this Tenant. If not, the answer is 404.",
      "The server checks that their Role can edit. A staff member gets 403.",
      "Each pasted value must be an http or https URL. Paths drop to the origin. Duplicates drop, keeping the first. Other schemes, `*`, and more than 20 unique origins fail the whole write with 400, and the previous list is unchanged.",
      "The server stores the unique origins in the order they were saved and returns the Tenant.",
    ],
    example: [
      "A cafe pastes its menu URL. The saved origin is the site itself:",
      bash(
        `curl -X PATCH ${EXAMPLE_BASE_URL}/tenants/${EXAMPLE_TENANT_ID}/allowed-origins \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"allowedOrigins":["https://sorellacafe.com/menu"]}\'',
      ),
      json(
        `{\n  "data": { "id": "${EXAMPLE_TENANT_ID}", "name": "Sorella Cafe", "slug": "sorella-cafe", "timezone": "Europe/Rome", "country": "IT", "currency": "EUR", "allowedOrigins": ["https://sorellacafe.com"], "role": "owner", "canEdit": true },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant with its new Allowed origins.", envelope(TenantSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
