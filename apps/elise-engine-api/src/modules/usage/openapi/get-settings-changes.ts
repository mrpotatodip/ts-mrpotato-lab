import { describeRoute } from "hono-openapi";
import { SettingsChangesSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const getSettingsChangesDoc = describeRoute({
  tags: ["usage"],
  summary: "The recent changes to the account's scan settings",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "An admin sees who changed the account's scan settings, and when: the monthly budget (from what to what, `null` being the platform default), and the Anthropic key being set or removed (with its last four characters, never the key). Only the last 20 changes are returned, newest first. Each has a `kind`: `budget`, `anthropic_key_set` or `anthropic_key_removed`.",
    steps: [
      "The Worker checks the session and that the login's Role in the account named by `x-account-id` holds the Power `company:usage:budget:update`.",
      "The Worker reads the account's audit rows for these settings and names each actor from the person behind the login, or `null` once the login is gone.",
    ],
    example: [
      "Read the changes:",
      bash(`curl ${EXAMPLE_BASE_URL}/usage/changes \\`, '  -H "authorization: Bearer $SESSION_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`),
    ],
  }),
  responses: { 200: jsonResponse("The recent changes.", envelope(SettingsChangesSchema)), ...errorResponses(400, 401, 403) },
});
