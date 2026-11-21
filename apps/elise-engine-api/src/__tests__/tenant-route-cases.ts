// -----
// "own" is for a route that answers one record of the caller's
// Account, not a list: the answer must match the caller's values,
// which differ from those the guard seeds for the other Account.
// "listedIn" names the one field that holds the list, for an
// answer that carries other arrays (the counts of /files list one
// row for each file type even when there is no file).
// -----
export type CrossAccountCase =
  | { kind: "run"; path: string; method?: string; body?: unknown; as?: "stranger"; listedIn?: string; expect: "not-found" | "empty" | "refused" | "created" }
  | { kind: "run"; path: string; method?: string; body?: unknown; as?: "stranger"; expect: "own"; own: Record<string, number | string | null> }
  | { kind: "service-test"; shownBy: string };

// -----
// A write that takes no ID but the caller's own Account, so
// there is no other Account's ID to pass, and that needs the
// key secret, which the guard has not got.
// The test it names shows the write stays in the caller's
// Account.
// -----
const serviceTest = (shownBy: string): CrossAccountCase => ({ kind: "service-test", shownBy });

// -----
// The repo and fingerprint of the finding the guard test
// seeds for "another" Account: the case names them as one
// Account that is not its owner.
// -----
const OTHER_REPO = "https://github.com/octocat/Hello-World";
const OTHER_FINGERPRINT = "b".repeat(64);
export const OTHER_COMMENT_ID = "00000000-0000-4000-8000-0000000000b1";
export const OTHER_REPO_ID = "00000000-0000-4000-8000-0000000000b2";
export const OTHER_SECOND_REPO = "https://github.com/octocat/Spoon-Knife";
export const OTHER_GROUP_ID = "00000000-0000-4000-8000-0000000000b5";
export const OTHER_GROUP_NAME = "Backend";
export const OTHER_INVITE_ID = "00000000-0000-4000-8000-0000000000b6";
export const OTHER_PARTY_ID = "00000000-0000-4000-8000-0000000000b7";
export const OTHER_RUNNER_ID = "00000000-0000-4000-8000-0000000000c1";
export const OTHER_RUNNER_NAME = "runner-of-the-other";

// -----
// Routes that name no Account of their own: sign-in, the
// invite link (its token is the credential), the Runner's
// own token routes, the developer docs, and the plans list. The
// plans list does need x-account-id and a Power; only its rows are
// global (the platform's catalogue: the same for every Account,
// none of them an Account's own).
// -----
export const NOT_TENANT_ROUTES: readonly string[] = [
  "GET /usage/plan/offers",
  "POST /stripe/webhook",
  "GET /auth/*",
  "POST /auth/*",
  "POST /sign-up",
  "GET /me",
  "GET /team/invites/:token",
  "POST /team/invites/:token/accept",
  "POST /runners/enroll",
  "POST /runners/claim",
  "POST /runners/login/start",
  "POST /runners/login/check",
  "GET /runners/login/lookup",
  "POST /runners/jobs/:scanId/result",
  "GET /runners/jobs/:scanId",
  "GET /runners/jobs/:scanId/archive",
  "POST /runners/jobs/:scanId/trace",
  "POST /runners/jobs/:scanId/findings",
  "GET /runners/me",
  "DELETE /runners/me",
  "GET /openapi.json",
  "GET /docs",
];

// -----
// One entry for every other route, run in this order. "run" is
// called as one Account with another Account's IDs: "not-found"
// answers 404, "empty" 200 with at least one list and no entries
// in any (a new repo: no history, no branches), "refused" 400 (a
// body that names another Account's row), and "created" 201 for a
// write that lands in the caller's Account only (a name another
// Account already uses is free here). A list that names no ID
// runs as "stranger", an Account with no rows, so the list is
// empty unless it shows another Account's rows.
// -----
export const CROSS_ACCOUNT_CASES = {
  "GET /findings": { kind: "run", path: "/findings?scanId=theirs", expect: "empty" },
  "GET /findings/comments": { kind: "run", path: `/findings/comments?repo=${OTHER_REPO}&fingerprint=${OTHER_FINGERPRINT}`, expect: "empty" },
  "POST /findings/comments": {
    kind: "run",
    path: "/findings/comments",
    method: "POST",
    body: { repo: OTHER_REPO, fingerprint: OTHER_FINGERPRINT, body: "Not mine to write" },
    expect: "not-found",
  },
  "DELETE /findings/comments/:commentId": { kind: "run", path: `/findings/comments/${OTHER_COMMENT_ID}`, method: "DELETE", expect: "not-found" },
  "PATCH /findings/comments/:commentId": {
    kind: "run",
    path: `/findings/comments/${OTHER_COMMENT_ID}`,
    method: "PATCH",
    body: { body: "Not mine to edit" },
    expect: "not-found",
  },
  "PUT /findings/triage": {
    kind: "run",
    path: "/findings/triage",
    method: "PUT",
    body: { repo: OTHER_REPO, fingerprint: OTHER_FINGERPRINT, status: "fixed" },
    expect: "not-found",
  },
  "GET /repos": { kind: "run", path: "/repos", as: "stranger", expect: "empty" },
  "POST /repos": { kind: "run", path: "/repos", method: "POST", body: { repo: OTHER_SECOND_REPO }, expect: "empty" },
  "GET /repos/:repoId": { kind: "run", path: `/repos/${OTHER_REPO_ID}`, expect: "not-found" },
  "GET /repos/:repoId/findings": { kind: "run", path: `/repos/${OTHER_REPO_ID}/findings`, expect: "not-found" },
  "POST /repos/:repoId/branches": { kind: "run", path: `/repos/${OTHER_REPO_ID}/branches`, method: "POST", body: { name: "release" }, expect: "not-found" },
  "GET /repos/:repoId/archives": { kind: "run", path: `/repos/${OTHER_REPO_ID}/archives`, expect: "not-found" },
  "POST /repos/:repoId/archives": { kind: "run", path: `/repos/${OTHER_REPO_ID}/archives?label=app.zip`, method: "POST", body: {}, expect: "not-found" },
  "DELETE /repos/:repoId/archives/:archiveId": { kind: "run", path: `/repos/${OTHER_REPO_ID}/archives/${OTHER_REPO_ID}`, method: "DELETE", expect: "not-found" },
  "DELETE /repos/:repoId": { kind: "run", path: `/repos/${OTHER_REPO_ID}`, method: "DELETE", expect: "not-found" },
  "GET /scans": { kind: "run", path: "/scans", expect: "empty" },
  "GET /scans/:scanId": { kind: "run", path: "/scans/theirs", expect: "not-found" },
  "GET /scans/:scanId/diff": { kind: "run", path: "/scans/theirs/diff", expect: "not-found" },
  "GET /scans/:scanId/trace": { kind: "run", path: "/scans/theirs/trace", expect: "not-found" },
  "GET /scans/:scanId/files/:file": { kind: "run", path: "/scans/theirs/files/REPORT.md", expect: "not-found" },
  // -----
  // The stranger, on a key of its own, scans the repo the other
  // Account has a live Scan of: that Scan and its repo row are not
  // the caller's, so the answer is "created", not 409 or 429.
  // -----
  "POST /scans": { kind: "run", path: "/scans", method: "POST", body: { repo: OTHER_REPO }, as: "stranger", expect: "created" },
  "POST /scans/:scanId/stop": { kind: "run", path: "/scans/theirs/stop", method: "POST", expect: "not-found" },
  "GET /files": { kind: "run", path: "/files", listedIn: "files", expect: "empty" },
  "GET /repos/:repoId/verdict": { kind: "run", path: `/repos/${OTHER_REPO_ID}/verdict?commit=${"c".repeat(40)}`, expect: "not-found" },
  "GET /usage": { kind: "run", path: "/usage", expect: "own", own: { budgetUsd: 20, spentUsd: 0, reservedUsd: 0, remainingUsd: 20, scans: 0 } },
  "GET /usage/budget/changes": { kind: "run", path: "/usage/budget/changes", expect: "empty" },
  "GET /usage/changes": { kind: "run", path: "/usage/changes", expect: "empty" },
  "GET /usage/credit": { kind: "run", path: "/usage/credit", expect: "own", own: { planKey: null, balanceUsd: 0, scans: 0 } },
  "GET /usage/credit/entries": { kind: "run", path: "/usage/credit/entries", expect: "empty" },
  "GET /usage/plan": { kind: "run", path: "/usage/plan", expect: "own", own: { plan: null, status: null, scans: 0 } },
  "POST /usage/plan/change": serviceTest("modules/plan/__tests__/plan-change.test.ts"),
  "POST /usage/plan/checkout": serviceTest("modules/plan/__tests__/plan-checkout.test.ts"),
  "POST /usage/plan/portal": serviceTest("modules/plan/__tests__/plan-checkout.test.ts"),
  // -----
  // After the two change lists: the change writes the caller's own
  // audit row, which those lists would then show.
  // -----
  "PATCH /usage/budget": { kind: "run", path: "/usage/budget", method: "PATCH", body: { monthlyBudgetUsd: null }, expect: "own", own: { budgetUsd: 20, spentUsd: 0, scans: 0 } },
  "GET /team": { kind: "run", path: "/team", expect: "empty" },
  "GET /team/roles": { kind: "run", path: "/team/roles", expect: "empty" },
  "POST /team/invites": {
    kind: "run",
    path: "/team/invites",
    method: "POST",
    body: { email: "new@example.com", role: "workspace_member", groupIds: [OTHER_GROUP_ID] },
    expect: "refused",
  },
  "DELETE /team/invites/:inviteId": { kind: "run", path: `/team/invites/${OTHER_INVITE_ID}`, method: "DELETE", expect: "not-found" },
  "GET /groups": { kind: "run", path: "/groups", expect: "empty" },
  "POST /groups": { kind: "run", path: "/groups", method: "POST", body: { name: OTHER_GROUP_NAME }, expect: "created" },
  "PATCH /groups/:groupId": { kind: "run", path: `/groups/${OTHER_GROUP_ID}`, method: "PATCH", body: { name: "Not mine to rename" }, expect: "not-found" },
  "DELETE /groups/:groupId": { kind: "run", path: `/groups/${OTHER_GROUP_ID}`, method: "DELETE", expect: "not-found" },
  "PUT /groups/:groupId/members/:partyId": { kind: "run", path: `/groups/${OTHER_GROUP_ID}/members/${OTHER_PARTY_ID}`, method: "PUT", expect: "not-found" },
  "DELETE /groups/:groupId/members/:partyId": { kind: "run", path: `/groups/${OTHER_GROUP_ID}/members/${OTHER_PARTY_ID}`, method: "DELETE", expect: "not-found" },
  "GET /usage/anthropic-key": { kind: "run", path: "/usage/anthropic-key", expect: "own", own: { source: "platform", lastFour: null } },
  "PUT /usage/anthropic-key": serviceTest("modules/anthropic-key/__tests__/anthropic-key-svc.test.ts"),
  "DELETE /usage/anthropic-key": { kind: "run", path: "/usage/anthropic-key", method: "DELETE", expect: "own", own: { source: "platform", lastFour: null } },
  "GET /runners": { kind: "run", path: "/runners", expect: "empty" },
  "DELETE /runners/:runnerId": { kind: "run", path: `/runners/${OTHER_RUNNER_ID}`, method: "DELETE", expect: "not-found" },
  // -----
  // Adding names no other Account's ID, so "created" says it lands
  // in the caller's Account. It stays below "GET /runners": the
  // Account has a Runner of its own from here on.
  // -----
  "POST /runners/login/approve": serviceTest("modules/runners/__tests__/runner-login.test.ts"),
  "POST /runners/login/deny": serviceTest("modules/runners/__tests__/runner-login.test.ts"),
  "POST /runners": { kind: "run", path: "/runners", method: "POST", body: { name: "Guard laptop" }, expect: "created" },
} satisfies Record<string, CrossAccountCase>;
