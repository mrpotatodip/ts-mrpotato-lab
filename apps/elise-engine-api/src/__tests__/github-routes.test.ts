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

beforeEach(() => {
  signedInUser = undefined;
  managesAccount = false;
});

const callWith = (env: Bindings, path: string, init: RequestInit, headers: Record<string, string>) =>
  app.fetch(new Request(`http://localhost${path}`, { ...init, headers: { ...headers, "content-type": "application/json" } }), env, testExecutionContext);

const call = (path: string, init: RequestInit = {}, headers: Record<string, string> = { "x-account-id": ACCOUNT }) => callWith(fakeBindings().env, path, init, headers);

const FINISH_BODY = JSON.stringify({ installationId: 42, code: "one-time", state: "signed-state", noticeAccepted: true });

const MANAGER_ROUTES: Array<[string, string, string | undefined]> = [
  ["POST", "/github/connect", undefined],
  ["POST", "/github/installations", FINISH_BODY],
  ["DELETE", "/github/installations/9b2f6c1e-3a4d-4e5f-8a7b-1c2d3e4f5a6b", undefined],
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

describe("GET /github/branches", () => {
  it("answers 400 for a query that is not an install and an owner/name, after the access check", async () => {
    const res = await call("/github/branches?installationId=not-a-uuid&repo=nope", {}, { authorization: `Bearer ${TEST_TOKEN}`, "x-account-id": ACCOUNT });

    expect(res.status).toBe(400);
  });
});

describe.each(["/github/installations", "/github/repos", "/github/branches?installationId=9b2f6c1e-3a4d-4e5f-8a7b-1c2d3e4f5a6b&repo=octo/hello"])("GET %s", (path) => {
  it("answers 401 with neither the service token nor a session", async () => {
    const res = await call(path);

    expect(res.status).toBe(401);
  });
});

describe("POST /github/connect", () => {
  it("tells an admin GitHub is not set up when the server has no App", async () => {
    signedInUser = "admin";
    managesAccount = true;

    const res = await call("/github/connect", { method: "POST" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ data: null, error: { message: "GitHub is not set up on this server" } });
  });
});

describe("DELETE /github/installations/:id", () => {
  it("answers 400 when the id is not a UUID, after the admin check", async () => {
    signedInUser = "admin";
    managesAccount = true;

    const res = await call("/github/installations/not-a-uuid", { method: "DELETE" });

    expect(res.status).toBe(400);
  });
});

describe("POST /github/installations", () => {
  it.each([
    ["the notice was not accepted", { installationId: 42, code: "c", state: "s", noticeAccepted: false }],
    ["the notice field is missing", { installationId: 42, code: "c", state: "s" }],
    ["the install is not a positive number", { installationId: 0, code: "c", state: "s", noticeAccepted: true }],
    ["the code is empty", { installationId: 42, code: "", state: "s", noticeAccepted: true }],
  ])("answers 400 when %s, after the admin check", async (_name, body) => {
    signedInUser = "admin";
    managesAccount = true;

    const res = await call("/github/installations", { method: "POST", body: JSON.stringify(body) });

    expect(res.status).toBe(400);
  });
});
