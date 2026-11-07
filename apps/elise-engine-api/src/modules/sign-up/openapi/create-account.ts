import { describeRoute } from "hono-openapi";
import { SignUpSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

export const createAccountDoc = describeRoute({
  tags: ["sign-up"],
  summary: "Sign up and start an account",
  description: routeText({
    context:
      "An invited person starts their own account. One request creates the Person, their login, the Tenant and the membership with the role `tenant_admin`. No login is needed, but the request must carry the invite code.",
    steps: [
      "The server looks the invite code up (case, dashes and spaces are ignored) and uses it in the same transaction. An unknown, revoked, expired or used-up code gets one generic 403 and nothing is saved.",
      "The server checks that the email has no login yet. If it has, the answer is 409.",
      "The server makes the Tenant slug from the account name, for example `Acme Labs` becomes `acme-labs`. If it is taken, it adds `-2`, `-3` and so on.",
      "The server saves everything in one transaction. If any step fails, nothing is saved.",
      "The server returns the login ID and the new Tenant. The login is not signed in yet: call `POST /auth/sign-in/email` next.",
    ],
    example: [
      "A new owner signs up with the invite code they were given:",
      bash(
        `curl -X POST ${EXAMPLE_BASE_URL}/sign-up -H "Content-Type: application/json" -d '{"inviteCode":"<invite-code>","firstName":"Ada","lastName":"Rossi","email":"ada@example.com","password":"correct-horse-battery","accountName":"Acme Labs","timezone":"Europe/Rome"}'`,
      ),
      json(
        `{\n  "data": {\n    "userId": "3f2a9c1e-7b64-4d0a-8e5f-1c2d3e4f5a6b",\n    "tenant": { "id": "${EXAMPLE_ACCOUNT_ID}", "name": "Acme Labs", "slug": "acme-labs", "timezone": "Europe/Rome", "role": "tenant_admin", "roleLabel": "Tenant admin", "powers": [] }\n  },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    201: jsonResponse("The new login and its account, with the role `tenant_admin`.", envelope(SignUpSchema)),
    ...errorResponses(400, 403, 409),
  },
});
