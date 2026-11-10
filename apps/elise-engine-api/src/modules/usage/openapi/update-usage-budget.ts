import { describeRoute } from "hono-openapi";
import { UsageSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const updateUsageBudgetDoc = describeRoute({
  tags: ["usage"],
  summary: "Set the monthly scan budget",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "An admin sets how many dollars the account may spend on scans each month. The budget has to be at most the account's allowance (`allowanceUsd` in the usage, which only the operator changes) and at least what this month has already spent or holds for running scans. `null` goes back to the platform default.",
    steps: [
      "The Worker checks the session and that the login's Role in the account named by `x-account-id` holds the Power `company:usage:budget:update`.",
      "The Worker answers 400 if the budget is above the allowance or below what the month has already committed.",
      "The Worker saves the budget and writes an audit row with the old and new values, in one transaction.",
      "The Worker returns the usage with the new budget.",
    ],
    example: [
      "Set the budget to $30:",
      bash(
        `curl -X PATCH ${EXAMPLE_BASE_URL}/usage/budget \\`,
        '  -H "authorization: Bearer $SESSION_TOKEN" \\',
        `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}" \\`,
        '  -H "Content-Type: application/json" \\',
        `  -d '{"monthlyBudgetUsd":30}'`,
      ),
    ],
  }),
  responses: { 200: jsonResponse("The usage with the new budget.", envelope(UsageSchema)), ...errorResponses(400, 401, 403) },
});
