import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authAccount, authUser } from "@repo/db-elise/schema";
import { hashPassword } from "better-auth/crypto";
import { buildAuth } from "#/lib/auth";
import type { QueuedEmail } from "#/modules/email";
import { openTestDb, seedTenant, type TestDb } from "./test-db";

let db: TestDb;

beforeAll(async () => {
  db = await openTestDb();
  const { partyId } = await seedTenant(db);
  const now = new Date();
  await db.raw.insert(authUser).values({ id: "u1", partyId, name: "Bo", email: "bo@example.com", emailVerified: true, createdAt: now, updatedAt: now });
  await db.raw.insert(authAccount).values({ id: "a1", accountId: "u1", providerId: "credential", userId: "u1", password: await hashPassword("old-password-1"), createdAt: now, updatedAt: now });
});

afterAll(() => db.close());

const makeAuth = (enqueueEmail: (mail: QueuedEmail) => Promise<void>) =>
  buildAuth({
    db: db.pool,
    secret: "s".repeat(32),
    baseUrl: "http://localhost:8787",
    trustedOrigins: ["http://localhost:3100"],
    dashboardUrl: "http://localhost:3100",
    enqueueEmail,
  });

const reset = async (auth: ReturnType<typeof makeAuth>, queued: QueuedEmail[]) => {
  await auth.api.requestPasswordReset({ body: { email: "bo@example.com" } });
  const link = queued.find((mail) => mail.kind === "password-reset")?.link ?? "";
  const token = new URL(link).searchParams.get("token") ?? "";
  return auth.api.resetPassword({ body: { token, newPassword: "new-password-22" } });
};

describe("password reset notice", () => {
  it("queues one password-reset-done message for the Login when a reset completes", async () => {
    const queued: QueuedEmail[] = [];
    const auth = makeAuth(async (mail) => {
      queued.push(mail);
    });
    await reset(auth, queued);

    const done = queued.filter((mail) => mail.kind === "password-reset-done");
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ to: "bo@example.com", link: "http://localhost:3100/forgot-password" });
  });

  it("still completes the reset when the enqueue fails", async () => {
    const queued: QueuedEmail[] = [];
    const auth = makeAuth(async (mail) => {
      if (mail.kind === "password-reset-done") throw new Error("queue down");
      queued.push(mail);
    });

    await expect(reset(auth, queued)).resolves.toMatchObject({ status: true });
  });
});
