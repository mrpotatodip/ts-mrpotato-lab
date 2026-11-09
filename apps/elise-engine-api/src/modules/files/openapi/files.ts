import { describeRoute } from "hono-openapi";
import { FileListSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const listFilesDoc = describeRoute({
  tags: ["files"],
  summary: "List the report files of an account",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "A person looks for a report across every scan of the account. This route lists the written files (`REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`), newest first. Open or download one with `GET /scans/{scanId}/files/{file}`.",
    steps: [
      "The Worker checks the token or session and the account.",
      "The Worker reads the account's files from the database. Each file's storage key must sit under the account's own prefix.",
      "The Worker filters by `repoId`, `branch`, `name`, a date range (`from`, `to`) and `q`, which matches part of the repo URL.",
      "The Worker returns up to `limit` files (50 by default) with a `nextCursor`.",
    ],
    example: [
      "List the reports of one repo:",
      bash(
        `curl "${EXAMPLE_BASE_URL}/files?name=REPORT.md&q=hello-world" \\`,
        '  -H "authorization: Bearer $SCAN_API_TOKEN" \\',
        `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`,
      ),
    ],
  }),
  responses: { 200: jsonResponse("A page of files.", envelope(FileListSchema)), ...errorResponses(400, 401) },
});
