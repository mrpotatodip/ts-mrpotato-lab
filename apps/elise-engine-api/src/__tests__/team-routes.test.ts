import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "#/index";
import type { Bindings } from "#/types/variables";
import { fakeBindings, TEST_TOKEN, testExecutionContext } from "./fake-bindings";
import { memoryScanRepo } from "./memory-scan-repo";
import { noGithubAccess } from "./no-github-access";

let signedInUser: string | undefined;
let managesAccount = false;

const app = buildApp({
  scanRepo: () => memoryScanRepo().repo,
  githubAccess: noGithubAccess,
  monthSpend: async () => ({ spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null }),
  sessionUserId: async () => signedInUser,
  userHasAccount: async () => true,
  userManagesAccount: async () => managesAccount,
}).app;

const ACCOUNT = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
const ID = "9b2f6c1e-3a4d-4e5f-8a7b-1c2d3e4f5a6b";

beforeEach(() => {
  signedInUser = undefined;
  managesAccount = false;
});

const call = (path: string, init: RequestInit = {}, headers: Record<string, string> = { "x-account-id": ACCOUNT }) => {
  const { env } = fakeBindings();
  return callWith(env, path, init, headers);
};

const callWith = (env: Bindings, path: string, init: RequestInit, headers: Record<string, string>) =>
  app.fetch(new Request(`http://localhost${path}`, { ...init, headers: { ...headers, "content-type": "application/json" } }), env, testExecutionContext);

const MANAGER_ROUTES: Array<[string, string, string | undefined]> = [
  ["GET", "/team", undefined],
  ["GET", "/team/roles", undefined],
  ["POST", "/team/invites", JSON.stringify({ email: "bo@example.com", role: "workspace_member" })],
  ["DELETE", `/team/invites/${ID}`, undefined],
  ["GET", "/groups", undefined],
  ["POST", "/groups", JSON.stringify({ name: "Backend" })],
  ["PATCH", `/groups/${ID}`, JSON.stringify({ name: "Platform" })],
  ["DELETE", `/groups/${ID}`, undefined],
  ["PUT", `/groups/${ID}/members/${ID}`, undefined],
  ["DELETE", `/groups/${ID}/members/${ID}`, undefined],
];

describe.each(MANAGER_ROUTES)("%s %s", (method, path, body) => {
  it("answers 401 with no session, even with the service token", async () => {
    const res = await call(path, { method, body }, { authorization: `Bearer ${TEST_TOKEN}`, "x-account-id": ACCOUNT });

    expect(res.status).toBe(401);
  });

  it("answers 403 for a login that is not an admin of the account", async () => {
    signedInUser = "member";
    const res = await call(path, { method, body });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "FORBIDDEN" } });
  });

  it("answers 400 when x-account-id is missing", async () => {
    signedInUser = "admin";
    managesAccount = true;
    const res = await call(path, { method, body }, {});

    expect(res.status).toBe(400);
  });
});

describe("validation, after the admin check", () => {
  it("rejects a bad invite body", async () => {
    signedInUser = "admin";
    managesAccount = true;
    const res = await call("/team/invites", { method: "POST", body: JSON.stringify({ email: "not-an-email", role: "workspace_member" }) });

    expect(res.status).toBe(400);
  });

  it("rejects a group name that is blank or too long", async () => {
    signedInUser = "admin";
    managesAccount = true;
    for (const name of ["   ", "x".repeat(61)]) {
      expect((await call("/groups", { method: "POST", body: JSON.stringify({ name }) })).status).toBe(400);
    }
  });
});
