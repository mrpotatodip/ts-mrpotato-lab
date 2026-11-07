import { describeRoute } from "hono-openapi";
import {
  EXAMPLE_ACCOUNT_ID,
  EXAMPLE_BASE_URL,
  EXAMPLE_SCAN_ID,
  SERVICE_SECURITY,
  bash,
  envelope,
  errorResponses,
  jsonResponse,
  routeText,
} from "#/lib/openapi";
import { ScanStatusSchema } from "#/schemas";

export const detailScanDoc = describeRoute({
  tags: ["scans"],
  summary: "Read the status of a scan",
  security: SERVICE_SECURITY,
  description: routeText({
    context: "A dashboard needs to know if a scan is done. This route returns its status, its settings, and the names of its saved files.",
    steps: [
      "The Worker checks the token and the account.",
      "The Worker reads the saved status of that scan. Another account gets 404.",
      "If the status is `queued` or `running`, the Worker asks the Workflow if it has died. If so, it returns `failed`.",
    ],
    example: [
      "Read the status:",
      bash(
        `curl ${EXAMPLE_BASE_URL}/scans/${EXAMPLE_SCAN_ID} \\`,
        '  -H "authorization: Bearer $SCAN_API_TOKEN" \\',
        `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`,
      ),
    ],
  }),
  responses: { 200: jsonResponse("The scan status.", envelope(ScanStatusSchema)), ...errorResponses(400, 401, 404) },
});
