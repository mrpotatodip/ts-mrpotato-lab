import { describeRoute, resolver } from "hono-openapi";
import { TenantSchema, UpdateTenantCustomerChatBodySchema } from "@repo/contracts/amelie";
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

export const updateTenantCustomerChatDoc = describeRoute({
  tags: ["tenants"],
  summary: "Replace the Customer chat button text and colour",
  security: STAFF_SECURITY,
  requestBody: {
    required: true,
    content: { "application/json": { schema: resolver(UpdateTenantCustomerChatBodySchema) } },
  },
  description: routeText({
    context:
      "An owner or manager sets how the Customer chat looks on the cafe site and on Amelie's public chat page. The dashboard assistant is unchanged.",
    steps: [
      "The server checks that the signed-in Person is a team member of this Tenant. If not, the answer is 404.",
      "The server checks that their Role can edit. A staff member gets 403.",
      "The button text must be 1 to 40 characters after trim. The colour is a #rrggbb hex value, or null to use Amelie's default.",
      "The server stores the look and returns the Tenant.",
    ],
    example: [
      "A cafe names the bubble Ask Sorella and paints it brick:",
      bash(
        `curl -X PUT ${EXAMPLE_BASE_URL}/tenants/${EXAMPLE_TENANT_ID}/customer-chat \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"customerChatLabel":"Ask Sorella","customerChatAccent":"#b4532a"}\'',
      ),
      json(
        `{\n  "data": { "id": "${EXAMPLE_TENANT_ID}", "name": "Sorella Cafe", "slug": "sorella-cafe", "timezone": "Europe/Rome", "country": "IT", "currency": "EUR", "allowedOrigins": ["https://sorellacafe.com"], "customerChatLabel": "Ask Sorella", "customerChatAccent": "#b4532a", "role": "owner", "canEdit": true },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant with its new Customer chat look.", envelope(TenantSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
