import { describeRoute } from "hono-openapi";
import { LiveFindingsSavedSchema } from "@repo/contracts/elise";
import { EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const saveLiveFindingsDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "Send verified Findings of a Scan the Runner is running",
  description: routeText({
    context:
      "While its agent works, the Runner sends each Finding a verifier has decided (`confirmed` or `needs_validation`), so the dashboard can show it before the Scan ends. The final result replaces them all, and a Scan that is stopped or fails drops them.",
    steps: [
      "The Worker reads the bearer token and finds the Runner.",
      "The Worker checks the Scan's job is this Runner's. Any other Scan is 404. A Scan that is not running is 409 and nothing is written.",
      "The Worker writes each record as a Finding of the Scan, replacing the one with the same fingerprint. A new fingerprint past 1,000 per Scan is dropped and counted in `dropped`.",
    ],
    example: [
      "Send one record:",
      bash(
        `curl -X POST ${EXAMPLE_BASE_URL}/runners/jobs/$SCAN_ID/findings \\`,
        '  -H "authorization: Bearer $RUNNER_TOKEN" \\',
        '  -H "Content-Type: application/json" \\',
        `  -d '{"findings":[{"verdict":"needs_validation","fingerprint":"auth-bypass-login","title":"Login skips the check","description":"The route trusts a header.","evidence":[{"file":"src/login.ts","line":12,"description":"reads x-user"}],"validation_plan":{"local":"send the header"}}]}'`,
      ),
    ],
  }),
  responses: { 200: jsonResponse("How many records were kept.", envelope(LiveFindingsSavedSchema)), ...errorResponses(400, 401, 404, 409) },
});
