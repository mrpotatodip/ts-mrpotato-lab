import { describeRoute } from "hono-openapi";
import { VerdictSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

const REPO_ID = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const AUTH = `  -H "authorization: Bearer $SCAN_API_TOKEN" \\`;
const ACCOUNT = `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`;

export const getVerdictDoc = describeRoute({
  tags: ["repos"],
  security: SERVICE_SECURITY,
  summary: "Can this commit ship?",
  description: routeText({
    context:
      "A verdict for one commit of a repo: `pass`, `fail` or `cannot_tell`. A `pass` means the scans of this commit found nothing over the limit. It does not mean the commit is safe. Only `pass` ships.",
    steps: [
      "The Worker reads the succeeded lite scans of the commit (a scan of a branch counts too) and merges their findings: a problem any scan found is open.",
      "`cannot_tell` when the commit has fewer than 2 scans, or one of the 2 newest did not check every problem the History had open, or the History had 50 or more open problems.",
      "Otherwise `fail` when more than 0 critical, 0 high or 3 medium problems are open, or when any open problem is not yet validated. Low and informational problems never block.",
      "A problem a person marked a false positive is listed under `dismissed`. An accepted risk is listed under `accepted` until its end date, and blocks again after it.",
      "Nothing is stored: every call computes the answer again.",
    ],
    example: ["Ask about a commit:", bash(`curl "${EXAMPLE_BASE_URL}/repos/${REPO_ID}/verdict?commit=${COMMIT}" \\`, AUTH, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The verdict, with the reasons and the problems behind it.", envelope(VerdictSchema)), ...errorResponses(400, 401, 403, 404) },
});
