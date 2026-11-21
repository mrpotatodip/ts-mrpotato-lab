import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser } from "@repo/db-elise/schema";
import { buildAuth } from "#/lib/auth";
import type { PasswordResetEmail } from "#/modules/email";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";

let test: TestDb;

beforeAll(async () => {
  test = await openTestDb();
  const { partyId } = await seedTenant(test);
  await test.raw.insert(authUser).values({ id: "u1", name: "Ada", email: "ada@example.com", partyId });
});

afterAll(() => test.close());

const countingLimiter = (limit: number): RateLimit => {
  const counts = new Map<string, number>();
  return {
    limit: async ({ key }) => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= limit };
    },
  };
};

const requestResets = async (emails: string[], limiter: RateLimit) => {
  const queued: PasswordResetEmail[] = [];
  const auth = buildAuth({
    db: test.pool,
    secret: "reset-limit-test-secret-0123456789abcdef",
    baseUrl: "http://localhost:8787",
    trustedOrigins: ["http://localhost:3100"],
    dashboardUrl: "http://localhost:3100",
    enqueueEmail: async (mail) => {
      if (mail.kind === "password-reset") queued.push(mail);
    },
    resetAddressLimiter: limiter,
  });
  const answers: { status: number; body: string }[] = [];
  for (const email of emails) {
    const res = await auth.handler(
      new Request("http://localhost:8787/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3100" },
        body: JSON.stringify({ email }),
      }),
    );
    answers.push({ status: res.status, body: await res.text() });
  }
  return { queued, answers };
};

describe("the reset limit per address", () => {
  it("queues no email past the cap, whatever the letter case, and answers the same", async () => {
    const { queued, answers } = await requestResets(["ada@example.com", "ADA@example.com", "Ada@Example.com", "ada@example.com", "ada@example.com"], countingLimiter(3));

    expect(queued).toHaveLength(3);
    expect(new Set(answers.map((a) => a.body)).size).toBe(1);
    expect(new Set(answers.map((a) => a.status))).toEqual(new Set([200]));
  });
});
