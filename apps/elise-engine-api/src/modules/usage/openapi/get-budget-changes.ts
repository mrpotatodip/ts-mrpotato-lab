import { describeRoute } from "hono-openapi";
import { UsageBudgetChangesSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const getBudgetChangesDoc = describeRoute({
  tags: ["usage"],
  summary: "The recent changes to the monthly scan budget",
  security: SERVICE_SECURITY,
  description: routeText({
    context: "An admin sees who changed the account's monthly budget, when, and from what to what. `null` means the account was on the platform default. Only the last 20 changes are returned, newest first.",
    steps: [
      "The Worker checks the session and that the login's Role in the account named by `x-account-id` holds the Power `company:usage:budget:update`.",
      "The Worker reads the account's budget audit rows and names each actor from the person behind the login, or `null` once the login is gone.",
    ],
    example: [
      "Read the changes:",
      bash(`curl ${EXAMPLE_BASE_URL}/usage/budget/changes \\`, '  -H "authorization: Bearer $SESSION_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`),
    ],
  }),
  responses: { 200: jsonResponse("The recent budget changes.", envelope(UsageBudgetChangesSchema)), ...errorResponses(400, 401, 403) },
});
