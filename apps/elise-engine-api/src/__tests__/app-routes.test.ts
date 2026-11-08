import { Effect } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { REPO_BRANCH_LIMIT } from "@repo/contracts/elise";
import { buildApp } from "#/index";
import type { Bindings } from "#/types/variables";
import { fakeBindings, TEST_TOKEN, testExecutionContext } from "./fake-bindings";
import { memoryScanRepo } from "./memory-scan-repo";

let ledger = memoryScanRepo();
let signedInUser: string | undefined;
let userHoldsRole = false;

const app = buildApp({
  scanRepo: () => ledger.repo,
  monthSpend: async () => ({ spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null }),
  sessionUserId: async () => signedInUser,
  userHasAccount: async () => userHoldsRole,
  userManagesAccount: async () => userHoldsRole,
}).app;

beforeEach(() => {
  ledger = memoryScanRepo();
  signedInUser = undefined;
  userHoldsRole = false;
});

const REPO = "https://github.com/octocat/Hello-World";
const ACCOUNT = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
const OTHER = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";
const auth = { authorization: `Bearer ${TEST_TOKEN}`, "x-account-id": ACCOUNT };

type ScanRequestBody = { repo: string; model?: string; effort?: string; max_budget_usd?: number; ref?: string };

const QueuedBodySchema = z.object({ data: z.object({ scanId: z.string() }) });
const ListBodySchema = z.object({
  data: z.object({ scans: z.array(z.object({ scanId: z.string() })), nextCursor: z.string().nullable() }),
});

const queuedScanId = async (res: Response): Promise<string> => QueuedBodySchema.parse(await res.json()).data.scanId;

const call = (env: Bindings, path: string, init: RequestInit = {}) => app.fetch(new Request(`http://localhost${path}`, init), env, testExecutionContext);
type AddBody = { repo?: string; branches?: string[]; name?: string };
const REPO_ID = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";

const post = (env: Bindings, body: ScanRequestBody, headers: Record<string, string> = auth) =>
  call(env, "/scans", { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body) });

describe("auth", () => {
  it("rejects a request with no token", async () => {
    const { env } = fakeBindings();
    const res = await call(env, "/scans", { headers: { "x-account-id": ACCOUNT } });

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "UNAUTHORIZED" } });
  });

  it("rejects the text 'Bearer undefined'", async () => {
    const { env } = fakeBindings();
    const res = await call(env, "/scans", { headers: { authorization: "Bearer undefined", "x-account-id": ACCOUNT } });

    expect(res.status).toBe(401);
  });

  it("answers 500 for every request when the token secret is not set", async () => {
    const { env } = fakeBindings({ SCAN_API_TOKEN: "" });
    const res = await call(env, "/scans", { headers: { authorization: "Bearer undefined", "x-account-id": ACCOUNT } });

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ data: null, error: { message: "Internal server error" } });
  });
});

describe("envelope", () => {
  it("answers an unknown path with the 404 envelope", async () => {
    const { env } = fakeBindings();
    const res = await call(env, "/nope");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "NOT_FOUND" } });
  });

  it("rejects an account ID that is not a UUID", async () => {
    const { env } = fakeBindings();
    const res = await call(env, "/scans", { headers: { authorization: auth.authorization, "x-account-id": "acme" } });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("answers a missing account header with a 400 envelope", async () => {
    const { env } = fakeBindings();
    const res = await call(env, "/scans", { headers: { authorization: auth.authorization } });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "VALIDATION_ERROR" } });
  });

  it("rejects a repo that is not a public GitHub URL", async () => {
    const { env } = fakeBindings();
    const res = await post(env, { repo: "https://evil.example/x/y" });

    expect(res.status).toBe(400);
  });

  it("rejects a model that is not on the list", async () => {
    const { env } = fakeBindings();
    const res = await post(env, { repo: REPO, model: "gpt-9" });

    expect(res.status).toBe(400);
  });

  it("rejects a budget above the ceiling", async () => {
    const { env } = fakeBindings();
    const res = await post(env, { repo: REPO, max_budget_usd: 5 });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});

describe("POST /scans", () => {
  it("queues a scan and starts the workflow", async () => {
    const { env, created } = fakeBindings();
    const res = await post(env, { repo: REPO, model: "claude-haiku-5-5", effort: "low", max_budget_usd: 1 });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({ data: { status: "queued", model: "claude-haiku-5-5", skill: "lite", maxBudgetUsd: 1 }, error: null });
    expect(created).toHaveLength(1);
    expect(created[0].params.accountId).toBe(ACCOUNT);
    expect(ledger.rows.get(created[0].params.scanId)).toMatchObject({ accountId: ACCOUNT, status: "queued" });
  });

  it("answers 429 when the account has too many active scans", async () => {
    const { env } = fakeBindings();
    for (let i = 0; i < 3; i++) expect((await post(env, { repo: `${REPO}-${i}` })).status).toBe(201);
    const res = await post(env, { repo: `${REPO}-3` });

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: { code: "TOO_MANY_ACTIVE_SCANS" } });
  });

  it("counts active scans per account", async () => {
    const { env } = fakeBindings();
    for (let i = 0; i < 3; i++) await post(env, { repo: `${REPO}-${i}` });
    const res = await post(env, { repo: `${REPO}-0` }, { ...auth, "x-account-id": OTHER });

    expect(res.status).toBe(201);
  });

  it("answers 409 for a second active scan of the same repo, however the URL is spelled, and names the running scan", async () => {
    const { env } = fakeBindings();
    const running = await queuedScanId(await post(env, { repo: REPO }));
    const res = await post(env, { repo: `${REPO.replace("octocat/Hello-World", "OCTOCAT/hello-world")}.git/` });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "CONFLICT", message: `This repo already has an active scan: ${running}` } });
  });

  it("takes a ref, and refuses one that could pass as a git option", async () => {
    const { env } = fakeBindings();

    expect((await post(env, { repo: REPO, ref: "--upload-pack=evil" })).status).toBe(400);
    expect((await post(env, { repo: REPO, ref: "release/1.2" })).status).toBe(201);
  });
});

describe("GET /scans", () => {
  it("lists the newest scan first", async () => {
    const { env } = fakeBindings();
    const first = await queuedScanId(await post(env, { repo: `${REPO}-a` }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await queuedScanId(await post(env, { repo: `${REPO}-b` }));
    const body = ListBodySchema.parse(await (await call(env, "/scans", { headers: auth })).json());

    expect(body.data.scans.map((scan) => scan.scanId)).toEqual([second, first]);
    expect(body.data.nextCursor).toBeNull();
  });

  it("shows nothing from another account", async () => {
    const { env } = fakeBindings();
    await post(env, { repo: REPO });
    const res = await call(env, "/scans", { headers: { ...auth, "x-account-id": OTHER } });

    expect(await res.json()).toMatchObject({ data: { scans: [], nextCursor: null } });
  });
});

describe("GET /scans/:scanId", () => {
  it("answers 404 for another account", async () => {
    const { env } = fakeBindings();
    const scanId = await queuedScanId(await post(env, { repo: REPO }));
    const res = await call(env, `/scans/${scanId}`, { headers: { ...auth, "x-account-id": OTHER } });

    expect(res.status).toBe(404);
  });

  it("reports failed when the workflow died without a final status", async () => {
    const { env } = fakeBindings({}, { status: "errored", error: { name: "Error", message: "boom" } });
    const scanId = await queuedScanId(await post(env, { repo: REPO }));
    const res = await call(env, `/scans/${scanId}`, { headers: auth });

    expect(await res.json()).toMatchObject({ data: { status: "failed", error: "boom" } });
  });

  it("returns the saved status of a queued scan", async () => {
    const { env } = fakeBindings();
    const scanId = await queuedScanId(await post(env, { repo: REPO }));
    const res = await call(env, `/scans/${scanId}`, { headers: auth });

    expect(await res.json()).toMatchObject({ data: { status: "queued", repo: REPO }, error: null });
  });
});

describe("GET /scans/:scanId/files/:file", () => {
  it("serves a saved file as a safe attachment", async () => {
    const { env, store } = fakeBindings();
    store.set(`accounts/${ACCOUNT}/scans/abc/REPORT.md`, "# report");
    await Effect.runPromise(
      ledger.repo.addFiles(ACCOUNT, "abc", [{ name: "REPORT.md", r2Key: `accounts/${ACCOUNT}/scans/abc/REPORT.md`, sizeBytes: 8, contentType: "text/markdown; charset=utf-8" }]),
    );
    const res = await call(env, "/scans/abc/files/REPORT.md", { headers: auth });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# report");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="REPORT.md"');
    expect(res.headers.get("content-security-policy")).toBe("sandbox");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refuses a file name that is not on the list", async () => {
    const { env, store } = fakeBindings();
    store.set(`accounts/${ACCOUNT}/scans/abc/prompt.txt`, "secret");
    const res = await call(env, "/scans/abc/files/prompt.txt", { headers: auth });

    expect(res.status).toBe(400);
  });

  it("answers 404 for another account", async () => {
    const { env, store } = fakeBindings();
    store.set(`accounts/${ACCOUNT}/scans/abc/REPORT.md`, "# report");
    await Effect.runPromise(
      ledger.repo.addFiles(ACCOUNT, "abc", [{ name: "REPORT.md", r2Key: `accounts/${ACCOUNT}/scans/abc/REPORT.md`, sizeBytes: 8, contentType: "text/markdown; charset=utf-8" }]),
    );
    const res = await call(env, "/scans/abc/files/REPORT.md", { headers: { ...auth, "x-account-id": OTHER } });

    expect(res.status).toBe(404);
  });
});

describe("signed-in session", () => {
  it("lets a login use an account where it holds a role", async () => {
    const { env } = fakeBindings();
    signedInUser = "user-1";
    userHoldsRole = true;
    const res = await call(env, "/scans", { headers: { authorization: "Bearer session-token", "x-account-id": ACCOUNT } });

    expect(res.status).toBe(200);
  });

  it("refuses a login that holds no role in the account", async () => {
    const { env } = fakeBindings();
    signedInUser = "user-1";
    const res = await call(env, "/scans", { headers: { authorization: "Bearer session-token", "x-account-id": ACCOUNT } });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "FORBIDDEN" } });
  });

  it("answers 400 when a signed-in login names no account", async () => {
    const { env } = fakeBindings();
    signedInUser = "user-1";
    userHoldsRole = true;
    const res = await call(env, "/scans", { headers: { authorization: "Bearer session-token" } });

    expect(res.status).toBe(400);
  });

  it("answers 401 on /me without a session", async () => {
    const { env } = fakeBindings();
    const res = await call(env, "/me");

    expect(res.status).toBe(401);
  });
});

const limiter = (success: boolean) => ({ limit: async () => ({ success }) });

describe("rate limits", () => {
  const signUpBody = JSON.stringify({ inviteCode: "x" });

  it("answers a limited sign-up like a wrong invite code", async () => {
    const { env } = fakeBindings({ SIGN_UP_LIMITER: limiter(false) });
    const res = await call(env, "/sign-up", { method: "POST", headers: { "content-type": "application/json" }, body: signUpBody });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "FORBIDDEN", message: "Invalid invite code" } });
  });

  it("answers 429 to a limited sign-in", async () => {
    const { env } = fakeBindings({ SIGN_IN_LIMITER: limiter(false) });
    const res = await call(env, "/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: { code: "SIGN_IN_RATE_LIMITED" } });
  });

  it("lets a request through while the limit holds", async () => {
    const { env } = fakeBindings({ SIGN_UP_LIMITER: limiter(true) });
    const res = await call(env, "/sign-up", { method: "POST", headers: { "content-type": "application/json" }, body: signUpBody });

    expect(res.status).toBe(400);
  });
});

describe("usage", () => {
  it("answers the month's spend and what is left", async () => {
    const { env } = fakeBindings();
    const res = await call(env, "/usage", { headers: auth });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { budgetUsd: 20, spentUsd: 0, reservedUsd: 0, remainingUsd: 20, scans: 0 }, error: null });
  });

  it("refuses a signed-in login that holds no role in the account", async () => {
    const { env } = fakeBindings();
    signedInUser = "user-1";
    const res = await call(env, "/usage", { headers: { authorization: "Bearer session-token", "x-account-id": ACCOUNT } });

    expect(res.status).toBe(403);
  });
});


describe("repo history routes", () => {
  it.each([
    "/repos",
    "/repos/5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6",
    "/repos/5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6/findings",
    `/repos/5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6/verdict?commit=${"a".repeat(40)}`,
    "/scans/abc/diff",
  ])(
    "answers 401 on %s with no token",
    async (path) => {
      const { env } = fakeBindings();

      expect((await call(env, path, { headers: { "x-account-id": ACCOUNT } })).status).toBe(401);
    },
  );

  it("answers 401 on the two routes that add a repo or a branch with no token", async () => {
    const { env } = fakeBindings();
    const headers = { "x-account-id": ACCOUNT, "content-type": "application/json" };

    expect((await call(env, "/repos", { method: "POST", headers, body: JSON.stringify({ repo: REPO }) })).status).toBe(401);
    expect((await call(env, `/repos/${REPO_ID}/branches`, { method: "POST", headers, body: JSON.stringify({ name: "release" }) })).status).toBe(401);
  });

  it("answers 400 for a repo or a branch that is not valid", async () => {
    const { env } = fakeBindings();
    const headers = { ...auth, "content-type": "application/json" };
    const send = (path: string, body: AddBody) => call(env, path, { method: "POST", headers, body: JSON.stringify(body) });

    expect((await send("/repos", { repo: "https://example.com/octocat/Hello-World" })).status).toBe(400);
    expect((await send("/repos", { repo: REPO, branches: Array.from({ length: REPO_BRANCH_LIMIT + 1 }, (_, k) => `b${k}`) })).status).toBe(400);
    expect((await send("/repos", { repo: REPO, branches: ["--upload-pack=evil"] })).status).toBe(400);
    expect((await send(`/repos/${REPO_ID}/branches`, { name: "--evil" })).status).toBe(400);
    expect((await send(`/repos/not-an-id/branches`, { name: "release" })).status).toBe(400);
  });

  it("answers 400 for a repo id that is not an id, and for a scan list filter that is not valid", async () => {
    const { env } = fakeBindings();

    expect((await call(env, "/repos/not-an-id", { headers: auth })).status).toBe(400);
    expect((await call(env, "/repos/5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6/verdict", { headers: auth })).status).toBe(400);
    expect((await call(env, "/repos/5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6/verdict?commit=main", { headers: auth })).status).toBe(400);
    expect((await call(env, "/scans?repoId=nope", { headers: auth })).status).toBe(400);
    expect((await call(env, "/scans?limit=500", { headers: auth })).status).toBe(400);
  });

  it("lists the scans of one repo", async () => {
    const { env } = fakeBindings();
    await post(env, { repo: `${REPO}-a` });
    await post(env, { repo: `${REPO}-b` });
    const [first] = [...ledger.repos.values()];
    const res = await call(env, `/scans?repoId=${first.id}`, { headers: auth });
    const body = ListBodySchema.parse(await res.json());

    expect(body.data.scans).toHaveLength(1);
  });

  it("answers 400 for a findings cursor that is not a number, never an empty page", async () => {
    const { env } = fakeBindings();
    const base = "/repos/5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6/findings";

    for (const cursor of ["abc", "-5", "1.5"]) {
      expect((await call(env, `${base}?cursor=${cursor}`, { headers: auth })).status).toBe(400);
    }
  });
});
