import { describeRoute } from "hono-openapi";
import {
  EXAMPLE_ACCOUNT_ID,
  EXAMPLE_BASE_URL,
  SERVICE_SECURITY,
  bash,
  envelope,
  errorResponses,
  jsonResponse,
  routeText,
} from "#/lib/openapi";
import { ScanListSchema } from "#/modules/scans/schemas";

export const listScansDoc = describeRoute({
  tags: ["scans"],
  summary: "List the scans of an account",
  security: SERVICE_SECURITY,
  description: routeText({
    context: "A dashboard shows the history of one account. This route lists its scans, newest first, 50 at a time.",
    steps: [
      "The Worker checks the token and the account.",
      "The Worker reads the status of the newest 50 scans of that account.",
      "The Worker returns them with a `nextCursor`. Send it as `?cursor=` to get the next page.",
    ],
    example: [
      "List the scans:",
      bash(`curl ${EXAMPLE_BASE_URL}/scans \\`, '  -H "authorization: Bearer $SCAN_API_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`),
    ],
  }),
  responses: { 200: jsonResponse("A page of scans.", envelope(ScanListSchema)), ...errorResponses(400, 401) },
});
