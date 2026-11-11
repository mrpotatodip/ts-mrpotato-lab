import { describeRoute } from "hono-openapi";
import { PlanDetailsSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

const EXAMPLE = `{ "data": { "plan": { "key": "pro", "label": "Pro", "monthlyPriceUsd": 49, "includedCreditUsd": 49, "carryCapUsd": 100, "keySource": "platform", "scanAllowance": null, "maxMembers": 5 }, "status": "active", "source": "grant", "currentPeriodEnd": null, "scans": 12, "seats": { "members": 3, "pendingInvites": 1 } }, "error": null }`;

export const getPlanDoc = describeRoute({
  tags: ["usage"],
  summary: "The account's plan and subscription",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "What the Plan page shows. A plan gives an account credit or its own key, a number of seats and an allowance of scans. The subscription says whether it is active and whether we granted it or Stripe bills it. Stripe IDs and the credit markup are not returned.",
    steps: [
      "The Worker checks the signed-in login and that its role in the account holds the plan read Power.",
      "The Worker reads the account's subscription and plan, the month's scans, and the people and waiting invites.",
      "The Worker returns them. An account with no plan gets null for the plan, the status, the source and the period end.",
    ],
    example: ["Read the plan:", bash(`curl ${EXAMPLE_BASE_URL}/usage/plan \\`, '  -H "cookie: $SESSION_COOKIE" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`), json(EXAMPLE)],
  }),
  responses: { 200: jsonResponse("The account's plan and subscription.", envelope(PlanDetailsSchema)), ...errorResponses(400, 401, 403) },
});
