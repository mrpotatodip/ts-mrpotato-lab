import { describeRoute } from "hono-openapi";
import { SignUpSchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const createAccountDoc = describeRoute({
  tags: ["sign-up"],
  summary: "Sign up and start a cafe",
  description: routeText({
    context:
      "An invited person starts their own cafe. One request creates the Person, their login, the Organization, the Tenant and the team member with the role `owner`. The new cafe is empty: no menu, hours or FAQs. No login is needed, but the request must carry the invite code.",
    steps: [
      "The server looks the invite code up (case, dashes and spaces are ignored) and uses it in the same transaction. An unknown, revoked, expired or used-up code gets one generic 403 and nothing is saved.",
      "The server checks that the email has no account yet. If it has, the answer is 409.",
      "The server makes the Tenant slug from the cafe name, for example `Sorella Cafe` becomes `sorella-cafe`. If it is taken, it adds `-2`, `-3` and so on.",
      "The server saves everything in one transaction. If any step fails, nothing is saved.",
      "The server returns the login id and the new Tenant. The login is not signed in yet: call `POST /auth/sign-in/email` next.",
    ],
    example: [
      "A new owner signs up with the invite code they were given. `website` is optional and becomes the Allowed origin of the cafe:",
      bash(
        `curl -X POST ${EXAMPLE_BASE_URL}/public/sign-up -H "Content-Type: application/json" -d '{"inviteCode":"<invite-code>","firstName":"Ada","lastName":"Rossi","email":"ada@sorellacafe.com","password":"correct-horse-battery","cafeName":"Sorella Cafe","timezone":"Europe/Rome","country":"IT","currency":"EUR","website":"https://sorellacafe.com"}'`,
      ),
      json(
        `{\n  "data": {\n    "userId": "3f2a9c1e-7b64-4d0a-8e5f-1c2d3e4f5a6b",\n    "tenant": { "id": "${EXAMPLE_TENANT_ID}", "name": "Sorella Cafe", "slug": "sorella-cafe", "timezone": "Europe/Rome", "country": "IT", "currency": "EUR", "allowedOrigins": ["https://sorellacafe.com"], "role": "tenant_admin" }\n  },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    201: jsonResponse("The new login and its cafe, with the role `owner`.", envelope(SignUpSchema)),
    ...errorResponses(400, 403, 409),
  },
});
