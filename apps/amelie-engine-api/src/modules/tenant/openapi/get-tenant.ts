import { describeRoute } from "hono-openapi";
import { TenantSchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  STAFF_SECURITY,
  bash,
  envelope,
  errorResponses,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const getTenantDoc = describeRoute({
  tags: ["tenants"],
  summary: "Get one of my Tenants",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "The dashboard has a Tenant id and needs the details: name, slug, timezone, country, currency, Allowed origins and the role of the signed-in Person.",
    steps: [
      "The server reads the signed-in login from the session token.",
      "The server looks for a Tenant with this id where this Person is a team member.",
      "If it finds one, it returns the Tenant. If not, the answer is 404.",
    ],
    example: [
      "The answer is 404 for a Tenant that does not exist. It is also 404 for a Tenant that belongs to someone else. This way a caller cannot learn which ids exist.",
      bash(`curl ${EXAMPLE_BASE_URL}/tenants/${EXAMPLE_TENANT_ID} -H "Authorization: Bearer $TOKEN"`),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant, with the role of this Person.", envelope(TenantSchema)),
    ...errorResponses(400, 401, 404),
  },
});
