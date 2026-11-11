import { describeRoute } from "hono-openapi";
import {
  EXAMPLE_ACCOUNT_ID,
  EXAMPLE_BASE_URL,
  SERVICE_SECURITY,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";
import { ScanQueuedSchema } from "#/modules/scans/schemas";

export const createScanDoc = describeRoute({
  tags: ["scans"],
  summary: "Start a scan",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "A dashboard needs a security report for a public GitHub repo. This route starts a scan and returns at once. The scan runs in the background.",
    steps: [
      "The Worker checks the token, the account, and the options.",
      "The Worker finds or makes the repo's record for the account. `Octocat/Hello-World.git` and `octocat/hello-world` are one repo.",
      "The Worker refuses the request if the account already has too many active scans, or if this repo already has an active scan (409, naming the running scan).",
      "The Worker saves the status `queued` and starts the Workflow. The scan reads the default branch, or the `ref` (a branch, tag or commit) if one is given, and records the commit it read.",
      "A lite scan is given the repo's unresolved findings from earlier scans and re-checks them first, so a problem is carried forward, closed only by evidence, or flagged as back.",
      "The Worker returns the scan ID. Read the status with GET /scans/{scanId}.",
    ],
    example: [
      "Start a scan of a small repo:",
      bash(
        `curl -X POST ${EXAMPLE_BASE_URL}/scans \\`,
        '  -H "authorization: Bearer $SCAN_API_TOKEN" \\',
        `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}" \\`,
        '  -H "content-type: application/json" \\',
        '  -d \'{ "repo": "https://github.com/octocat/Hello-World", "model": "claude-haiku-5-5", "effort": "low" }\'',
      ),
      "You get:",
      json(
        '{ "data": { "scanId": "zd3u73nfd-06ac9c07-b80c-45da-8fc5-ece4768b5b22", "status": "queued", "skill": "lite", "model": "claude-haiku-5-5", "effort": "low", "profile": "quick", "maxBudgetUsd": 2 }, "error": null }',
      ),
    ],
  }),
  responses: {
    201: jsonResponse("The scan is queued.", envelope(ScanQueuedSchema)),
    ...errorResponses(400, 401, 409, 429),
  },
});
