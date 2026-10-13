import { beforeAll, describe, expect, it } from "vitest";
import { Hono, type Context } from "hono";
import type { SignUpBody } from "@repo/contracts/amelie";
import { SignUpBodySchema } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { createAccountSvc, requireSignUpLimit } from "#/modules/sign-up";
import { createTestDb } from "#/__tests__/amelie-test-db";

const INVITE = "let-me-in-please";
const LIMIT = 5;

const body = (overrides: Partial<SignUpBody> = {}): SignUpBody => ({
  inviteCode: INVITE,
  firstName: "Ada",
  lastName: "Rossi",
  email: "ada@sorella.test",
  password: "correct-horse-battery",
  cafeName: "Sorella Cafe",
  timezone: "Europe/Rome",
  country: "IT",
  currency: "EUR",
  ...overrides,
});

// -----
// A fake binding with the real shape: counts
// calls per key, refuses past LIMIT.
// -----
const fakeLimiter = () => {
  const seen = new Map<string, number>();
  return {
    limit: async ({ key }: { key: string }) => {
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      return { success: n <= LIMIT };
    },
  };
};

type FakeLimiter = ReturnType<typeof fakeLimiter>;

const withIp = (ip?: string): Record<string, string> => (ip ? { "cf-connecting-ip": ip } : {});

// -----
// The sign-up route's own pieces (limiter, body
// check, service) on an in-memory database, with
// the app's error shape. A wrong code reads the
// database; a refused request never gets there.
// -----
let db: DbConnectType;

beforeAll(async () => {
  db = await createTestDb();
});

const refusalResponse = (err: Error, c: Context) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL";
  // SAFETY: AppError subclasses only use 4xx/5xx codes.
  return c.json({ data: null, error: { code, message: err.message } }, status as 403);
};

const signUpApp = new Hono<AppEnv>();
signUpApp.onError(refusalResponse);
signUpApp.post("/", requireSignUpLimit, zValidator("json", SignUpBodySchema), async (c) => {
  const data = await runEffect(createAccountSvc(db, c.req.valid("json")));
  return c.json({ data, error: null }, 201);
});

const post = (payload: SignUpBody, ip: string, limiter?: FakeLimiter) =>
  signUpApp.fetch(
    new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...withIp(ip) },
      body: JSON.stringify(payload),
    }),
    // SAFETY: only the limiter binding is read.
    { SIGN_UP_LIMITER: limiter } as never,
  );

// -----
// Just the limiter in front of a handler that says
// "reached", so no database is involved.
// -----
const limitedApp = new Hono<AppEnv>();
limitedApp.onError(refusalResponse);
limitedApp.post("/", requireSignUpLimit, (c) => c.text("reached"));

const attempt = (limiter?: FakeLimiter, ip?: string) =>
  limitedApp.fetch(
    new Request("http://localhost/", { method: "POST", headers: withIp(ip) }),
    // SAFETY: only the limiter binding is read.
    { SIGN_UP_LIMITER: limiter } as never,
  );

describe("sign-up rate limit", () => {
  it("lets attempts through up to the limit, then refuses", async () => {
    const limiter = fakeLimiter();
    for (let i = 0; i < LIMIT; i++) {
      expect(await (await attempt(limiter, "1.1.1.1")).text()).toBe("reached");
    }

    const over = await attempt(limiter, "1.1.1.1");

    expect(over.status).toBe(403);
  });

  it("refuses a correct invite code once over the limit", async () => {
    const limiter = fakeLimiter();
    for (let i = 0; i < LIMIT; i++) await post(body({ inviteCode: "wrong" }), "1.1.1.1", limiter);

    const res = await post(body(), "1.1.1.1", limiter);

    expect(res.status).toBe(403);
  });

  it("counts each IP on its own", async () => {
    const limiter = fakeLimiter();
    for (let i = 0; i < LIMIT + 1; i++) await attempt(limiter, "1.1.1.1");

    const other = await attempt(limiter, "2.2.2.2");

    expect(await other.text()).toBe("reached");
  });

  it("shares one key when there is no IP header", async () => {
    const limiter = fakeLimiter();
    for (let i = 0; i < LIMIT; i++) await attempt(limiter);

    const over = await attempt(limiter);

    expect(over.status).toBe(403);
  });

  it("answers a rate-limited request exactly like a wrong invite code", async () => {
    const limiter = fakeLimiter();
    const wrongCode = await post(body({ inviteCode: "wrong" }), "3.3.3.3", limiter);
    for (let i = 1; i < LIMIT; i++) await post(body({ inviteCode: "wrong" }), "3.3.3.3", limiter);
    const limited = await post(body({ inviteCode: "wrong" }), "3.3.3.3", limiter);

    expect(limited.status).toBe(wrongCode.status);
    const wrongCodeBody = await wrongCode.json();
    expect(await limited.json()).toEqual(wrongCodeBody);
    expect(wrongCodeBody).toMatchObject({
      data: null,
      error: { code: "FORBIDDEN", message: "Invalid invite code" },
    });
  });

  it("does not limit when the binding is absent (local dev)", async () => {
    for (let i = 0; i < LIMIT + 2; i++) {
      expect(await (await attempt(undefined, "5.5.5.5")).text()).toBe("reached");
    }
  });
});
