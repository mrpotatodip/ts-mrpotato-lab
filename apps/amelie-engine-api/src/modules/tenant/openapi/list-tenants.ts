import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { TenantSchema } from "@repo/contracts/amelie";
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

export const listTenantsDoc = describeRoute({
  tags: ["tenants"],
  summary: "List my Tenants",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "A Tenant is an Amelie account that belongs to one business. One signed-in Person can be a team member of several Tenants. The dashboard calls this route first, to show the Tenant picker.",
    steps: [
      "The server reads the signed-in login from the session token.",
      "The server finds every Tenant that this Person is a team member of.",
      "The server returns each Tenant with the role of this Person: `owner`, `admin` or `member`.",
    ],
    example: [
      "A Person runs two cafes. They get two Tenants:",
      bash(`curl ${EXAMPLE_BASE_URL}/tenants -H "Authorization: Bearer $TOKEN"`),
      json(
        `{\n  "data": [\n    { "id": "${EXAMPLE_TENANT_ID}", "name": "Sorella Cafe", "slug": "sorella-cafe", "timezone": "Europe/Rome", "country": "IT", "currency": "EUR", "allowedOrigins": ["https://sorellacafe.com"], "role": "owner" }\n  ],\n  "error": null\n}`,
      ),
      "Keep the `id`. The chat routes need it as `tenantId`.",
    ],
  }),
  responses: {
    200: jsonResponse("The Tenants of this Person.", envelope(z.array(TenantSchema))),
    ...errorResponses(401),
  },
});
