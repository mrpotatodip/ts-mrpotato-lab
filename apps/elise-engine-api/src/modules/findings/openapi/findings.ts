import { describeRoute } from "hono-openapi";
import { FindingListSchema, FindingTriageSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const listFindingsDoc = describeRoute({
  tags: ["findings"],
  summary: "List the findings of an account",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "A dashboard shows the problems the scans found. This route reads them from the database, worst first, with what a person decided about each. A finding is not a confirmed vulnerability until a person checks it.",
    steps: [
      "The Worker checks the token or session and the account.",
      "The Worker picks the findings of each repo's newest successful scan, or of one scan when `scanId` is set.",
      "The Worker filters by `repo`, `severity`, `status` and `triage`. A finding with no decision counts as `open`.",
      "The Worker returns up to `limit` findings (50 by default) with a `nextCursor`.",
    ],
    example: [
      "List the open high-severity findings:",
      bash(
        `curl "${EXAMPLE_BASE_URL}/findings?severity=high&triage=open" \\`,
        '  -H "authorization: Bearer $SCAN_API_TOKEN" \\',
        `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`,
      ),
    ],
  }),
  responses: { 200: jsonResponse("A page of findings.", envelope(FindingListSchema)), ...errorResponses(400, 401, 403) },
});

export const setFindingTriageDoc = describeRoute({
  tags: ["findings"],
  summary: "Record what a person decided about a finding",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "A person marks a finding as open, fixed, a false positive or an accepted risk. The decision is kept per repo and fingerprint, so a rescan that finds the same problem keeps it.",
    steps: [
      "The Worker checks the token or session and the account.",
      "The Worker checks that the account has a finding with this repo and fingerprint. If not, the answer is 404.",
      "The Worker saves the decision, with the person who made it when the caller is signed in.",
    ],
    example: [
      "Mark a finding as a false positive:",
      bash(
        `curl -X PUT ${EXAMPLE_BASE_URL}/findings/triage \\`,
        '  -H "authorization: Bearer $SESSION_TOKEN" \\',
        `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}" -H "Content-Type: application/json" \\`,
        `  -d '{"repo":"https://github.com/octocat/Hello-World","fingerprint":"<64 hex characters>","status":"false_positive","note":"test fixture"}'`,
      ),
    ],
  }),
  responses: { 200: jsonResponse("The saved decision.", envelope(FindingTriageSchema)), ...errorResponses(400, 401, 403, 404) },
});
