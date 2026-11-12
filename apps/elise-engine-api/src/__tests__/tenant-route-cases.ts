export type CrossAccountCase =
  | { kind: "run"; path: string; expect: "not-found" | "empty" }
  | { kind: "pending"; ticket: number };

const pending = (ticket: number): CrossAccountCase => ({ kind: "pending", ticket });

// -----
// Routes that name no Account of their own: sign-in, the
// invite link (its token is the credential), the Runner's
// own token routes, and the developer docs.
// -----
export const NOT_TENANT_ROUTES: readonly string[] = [
  "GET /auth/*",
  "POST /auth/*",
  "POST /sign-up",
  "GET /me",
  "GET /team/invites/:token",
  "POST /team/invites/:token/accept",
  "POST /runners/enroll",
  "POST /runners/claim",
  "POST /runners/jobs/:scanId/result",
  "GET /runners/me",
  "DELETE /runners/me",
  "GET /openapi.json",
  "GET /docs",
];

// -----
// One entry for every other route. "run" is called as one
// Account with another Account's IDs. "pending" names the
// RLS ticket that moves the route onto the tenant role and
// replaces the entry with a "run" case.
// -----
export const CROSS_ACCOUNT_CASES = {
  "GET /findings": { kind: "run", path: "/findings?scanId=theirs", expect: "empty" },
  "PUT /findings/triage": pending(74),
  "GET /repos": pending(75),
  "POST /repos": pending(75),
  "GET /repos/:repoId": pending(75),
  "GET /repos/:repoId/findings": pending(75),
  "POST /repos/:repoId/branches": pending(75),
  "GET /scans": pending(76),
  "GET /scans/:scanId": pending(76),
  "GET /scans/:scanId/diff": pending(76),
  "GET /scans/:scanId/files/:file": pending(76),
  "POST /scans": pending(82),
  "GET /files": pending(81),
  "GET /repos/:repoId/verdict": pending(81),
  "GET /usage": pending(77),
  "PATCH /usage/budget": pending(77),
  "GET /usage/budget/changes": pending(77),
  "GET /usage/changes": pending(77),
  "GET /usage/credit": pending(77),
  "GET /usage/credit/entries": pending(77),
  "GET /usage/plan": pending(77),
  "GET /team": pending(78),
  "GET /team/roles": pending(78),
  "POST /team/invites": pending(78),
  "DELETE /team/invites/:inviteId": pending(78),
  "GET /groups": pending(78),
  "POST /groups": pending(78),
  "PATCH /groups/:groupId": pending(78),
  "DELETE /groups/:groupId": pending(78),
  "PUT /groups/:groupId/members/:partyId": pending(78),
  "DELETE /groups/:groupId/members/:partyId": pending(78),
  "POST /github/connect": pending(79),
  "POST /github/installations": pending(79),
  "GET /github/installations": pending(79),
  "DELETE /github/installations/:id": pending(79),
  "GET /github/branches": pending(79),
  "GET /github/repos": pending(79),
  "GET /usage/anthropic-key": pending(79),
  "PUT /usage/anthropic-key": pending(79),
  "DELETE /usage/anthropic-key": pending(79),
  "POST /runners": pending(80),
  "GET /runners": pending(80),
  "DELETE /runners/:runnerId": pending(80),
} satisfies Record<string, CrossAccountCase>;
