import { describeRoute } from "hono-openapi";
import { CreditBalanceSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

const EXAMPLE = `{ "data": { "planKey": "pro", "keySource": "platform", "balanceUsd": 41.25, "monthlyCreditUsd": 49, "scans": 12, "scanAllowance": null }, "error": null }`;

export const getCreditDoc = describeRoute({
  tags: ["usage"],
  summary: "The credit the account may spend on scans",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "A plan on the platform's key gives an account credit. Each scan takes its cost times the plan's markup, and a running scan holds its budget cap times the markup until it ends. A plan on the account's own key gives no credit.",
    steps: [
      "The Worker checks the token or session and the account.",
      "The Worker reads the account's plan and adds up its credit ledger. The balance already has the holds of running scans taken out.",
      "The Worker returns the plan, the balance, the credit a paid month adds, and the month's scans against the plan's allowance. An account with no plan gets a zero balance and null for the plan.",
    ],
    example: ["Read the credit:", bash(`curl ${EXAMPLE_BASE_URL}/usage/credit \\`, '  -H "authorization: Bearer $SCAN_API_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`), json(EXAMPLE)],
  }),
  responses: { 200: jsonResponse("The account's credit.", envelope(CreditBalanceSchema)), ...errorResponses(400, 401, 403) },
});
