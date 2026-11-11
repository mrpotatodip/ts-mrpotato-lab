import { describeRoute } from "hono-openapi";
import { CreditEntriesSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

const EXAMPLE = `{ "data": { "entries": [{ "id": "7b0c2f1e-3a54-4c1d-9a55-0f9f3e6f6a10", "kind": "scan_settle", "amountUsd": -0.42, "scanId": "zd3trs3d", "note": null, "createdAt": "2026-11-11T10:00:00.000Z" }], "nextCursor": null }, "error": null }`;

export const getCreditEntriesDoc = describeRoute({
  tags: ["usage"],
  summary: "The account's credit history",
  security: SERVICE_SECURITY,
  description: routeText({
    context:
      "Every change to an account's credit: the monthly grant, a top-up, what a scan took, an expiry or an adjustment. Amounts are signed, credit added is positive and credit taken is negative. A scan is one entry, its real charge; a scan still running shows the credit it holds.",
    steps: [
      "The Worker checks the signed-in login and that its role in the account holds the plan read Power.",
      "The Worker reads the ledger newest first, joining each scan's hold to its settle so the entry shows the charge.",
      "The Worker returns up to `limit` entries and a `nextCursor` when older ones remain.",
    ],
    example: ["Read the first page:", bash(`curl ${EXAMPLE_BASE_URL}/usage/credit/entries?limit=10 \\`, '  -H "cookie: $SESSION_COOKIE" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`), json(EXAMPLE)],
  }),
  responses: { 200: jsonResponse("A page of the credit history.", envelope(CreditEntriesSchema)), ...errorResponses(400, 401, 403) },
});
