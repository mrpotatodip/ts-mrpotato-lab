import { describeRoute } from "hono-openapi";
import { UsageSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const getUsageDoc = describeRoute({
  tags: ["usage"],
  summary: "What the account spent this month",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "A dashboard shows the spend of one account against its monthly budget. The month is the UTC calendar month. Costs are the agent's own estimate at the model's list price; tokens are exact counts.",
    steps: [
      "The Worker checks the token or session and the account.",
      "The Worker adds up the cost and tokens of every scan the account created this month.",
      "The Worker adds the cap of each scan that is still running as `reservedUsd`, and subtracts both from the budget.",
    ],
    example: [
      "Read the usage:",
      bash(`curl ${EXAMPLE_BASE_URL}/usage \\`, '  -H "authorization: Bearer $SCAN_API_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`),
    ],
  }),
  responses: { 200: jsonResponse("The month so far.", envelope(UsageSchema)), ...errorResponses(400, 401, 403) },
});
