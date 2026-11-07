import { describeRoute } from "hono-openapi";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, EXAMPLE_SCAN_ID, SERVICE_SECURITY, bash, errorResponses, routeText } from "#/lib/openapi";

export const readScanFileDoc = describeRoute({
  tags: ["scans"],
  summary: "Read a saved file of a scan",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "A dashboard shows the report of a finished scan. This route returns one saved file, for example `REPORT.md` or `findings.json`. The agent wrote the file, so treat its text as untrusted.",
    steps: [
      "The Worker checks the token and the account.",
      "The Worker accepts only the known file names. Any other name gets 400.",
      "The Worker returns the file as an attachment, with `nosniff` and a sandbox policy, so a browser never runs it as a page.",
    ],
    example: [
      "Read the report:",
      bash(
        `curl ${EXAMPLE_BASE_URL}/scans/${EXAMPLE_SCAN_ID}/files/REPORT.md \\`,
        '  -H "authorization: Bearer $SCAN_API_TOKEN" \\',
        `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`,
      ),
    ],
  }),
  responses: {
    200: {
      description: "The file.",
      content: { "text/markdown": { schema: { type: "string" } }, "application/json": { schema: { type: "object" } } },
    },
    ...errorResponses(400, 401, 404),
  },
});
