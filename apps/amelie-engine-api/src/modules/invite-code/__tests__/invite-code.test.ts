import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { addSuperuser, inviteCodes } from "@repo/db-amelie";
import {
  CreateInviteCodeBodySchema,
  InviteCodeParamSchema,
  INVITE_CODE_MAX_USES_LIMIT,
  INVITE_CODE_NOTE_MAX,
  type CreateInviteCodeBody,
  type CreatedInviteCode,
  type InviteCode,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { createRequireSuperuser } from "#/modules/admin";
import { hashInviteCode } from "#/modules/invite-code";
import { createInviteCodeSvc, listInviteCodesSvc, revokeInviteCodeSvc } from "#/modules/invite-code/handlers";
import { createTestDb, insertPersonWithLogin } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let boss: { userId: string; partyId: string };
let stranger: { userId: string; partyId: string };

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  // SAFETY: AppError subclasses only use 4xx/5xx codes.
  return c.json({ data: null, error: { message: err.message } }, status as 404);
});
app.use("*", async (c, next) => {
  c.set("userId", c.req.header("x-user-id") ?? "");
  await next();
});
app.use("/admin/*", createRequireSuperuser(() => db));
app.post("/admin/invite-codes", zValidator("json", CreateInviteCodeBodySchema), async (c) => {
  const data = await runEffect(createInviteCodeSvc(db, c.get("userId"), c.req.valid("json")));
  return c.json({ data, error: null }, 201);
});
app.get("/admin/invite-codes", async (c) => c.json({ data: await runEffect(listInviteCodesSvc(db)), error: null }));
app.post("/admin/invite-codes/:id/revoke", zValidator("param", InviteCodeParamSchema), async (c) => {
  const data = await runEffect(revokeInviteCodeSvc(db, c.req.valid("param").id));
  return c.json({ data, error: null });
});

// SAFETY: the connection is injected, so no binding is read.
const env = { HYPERDRIVE_REALTIME: { connectionString: "unused" } } as never;

const call = (userId: string, method: string, path: string, body?: Partial<CreateInviteCodeBody>) =>
  app.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers: { "x-user-id": userId, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );

const create = async (body: Partial<CreateInviteCodeBody> = {}): Promise<CreatedInviteCode> => {
  const res = await call(boss.userId, "POST", "/admin/invite-codes", body);
  expect(res.status).toBe(201);
  return (await res.json()).data;
};

const list = async (): Promise<InviteCode[]> => (await (await call(boss.userId, "GET", "/admin/invite-codes")).json()).data;

const insertRow = async (values: Partial<typeof inviteCodes.$inferInsert>) => {
  const [row] = await db
    .insert(inviteCodes)
    .values({ codeHash: crypto.randomUUID(), createdBy: boss.partyId, ...values })
    .returning();
  return row;
};

beforeAll(async () => {
  db = await createTestDb();
  boss = await insertPersonWithLogin(db, "boss@amelie.test");
  await addSuperuser(db, "boss@amelie.test");
  stranger = await insertPersonWithLogin(db, "stranger@amelie.test");
});

describe("who may call", () => {
  it("answers not found to a non-superuser on all three routes", async () => {
    const { inviteCode } = await create();
    const attempts = [
      call(stranger.userId, "POST", "/admin/invite-codes", {}),
      call(stranger.userId, "GET", "/admin/invite-codes"),
      call(stranger.userId, "POST", `/admin/invite-codes/${inviteCode.id}/revoke`),
    ];

    const statuses = (await Promise.all(attempts)).map((res) => res.status);

    expect(statuses).toEqual([404, 404, 404]);
  });

  it("changes nothing for a non-superuser", async () => {
    const before = await list();
    await call(stranger.userId, "POST", "/admin/invite-codes", {});
    await call(stranger.userId, "POST", `/admin/invite-codes/${before[0].id}/revoke`);

    expect(await list()).toEqual(before);
  });

  it("lets a superuser through", async () => {
    expect((await call(boss.userId, "GET", "/admin/invite-codes")).status).toBe(200);
  });
});

describe("create", () => {
  it("returns a well-formed code once, with its summary", async () => {
    const created = await create({ note: "  Ada, Sorella  ", maxUses: 3 });

    expect(created.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(created.inviteCode).toMatchObject({
      note: "Ada, Sorella",
      status: "active",
      useCount: 0,
      maxUses: 3,
      expiresAt: null,
      revokedAt: null,
      createdByName: "Test boss@amelie.test",
    });
  });

  it("uses one use and no expiry by default", async () => {
    const { inviteCode } = await create();

    expect(inviteCode).toMatchObject({ note: "", maxUses: 1, expiresAt: null });
  });

  it("stores only the hash of the normalised code", async () => {
    const { code, inviteCode } = await create();

    const [row] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, inviteCode.id));
    expect(row.codeHash).toBe(await hashInviteCode(code));
    expect(row.codeHash).toBe(await hashInviteCode(code.toLowerCase().replaceAll("-", " ")));
    expect(JSON.stringify(row)).not.toContain(code);
    expect(JSON.stringify(row)).not.toContain(code.replaceAll("-", ""));
    expect(row.createdBy).toBe(boss.partyId);
  });

  it("keeps the expiry the caller gave", async () => {
    const expiresAt = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1)).toISOString();

    const { inviteCode } = await create({ expiresAt });

    expect(inviteCode.expiresAt).toBe(expiresAt);
  });

  it("answers 400 for a bad max uses, a past expiry and an over-long note", async () => {
    const bodies = [
      { maxUses: 0 },
      { maxUses: -1 },
      { maxUses: 1.5 },
      { maxUses: INVITE_CODE_MAX_USES_LIMIT + 1 },
      { expiresAt: "2020-01-01T00:00:00.000Z" },
      { expiresAt: "tomorrow" },
      { note: "x".repeat(INVITE_CODE_NOTE_MAX + 1) },
    ];

    const statuses = await Promise.all(bodies.map(async (body) => (await call(boss.userId, "POST", "/admin/invite-codes", body)).status));

    expect(statuses).toEqual(bodies.map(() => 400));
  });

  it("accepts the largest max uses and the longest note", async () => {
    const { inviteCode } = await create({ maxUses: INVITE_CODE_MAX_USES_LIMIT, note: "x".repeat(INVITE_CODE_NOTE_MAX) });

    expect(inviteCode.maxUses).toBe(INVITE_CODE_MAX_USES_LIMIT);
  });
});

describe("list", () => {
  it("never carries a code or a hash", async () => {
    const { code } = await create({ note: "leak check" });

    const res = await call(boss.userId, "GET", "/admin/invite-codes");
    const text = await res.text();

    expect(text).not.toContain(code);
    expect(text).not.toContain(code.replaceAll("-", ""));
    expect(text).not.toContain(await hashInviteCode(code));
    expect(text.toLowerCase()).not.toContain("hash");
  });

  it("reports active, used_up, expired and revoked, newest first", async () => {
    const day = 24 * 60 * 60 * 1000;
    const base = new Date().getTime() + 10 * day;
    const active = await insertRow({ note: "s-active", createdAt: new Date(base + 1) });
    const usedUp = await insertRow({ note: "s-used", maxUses: 2, useCount: 2, createdAt: new Date(base + 2) });
    const expired = await insertRow({ note: "s-expired", expiresAt: new Date(new Date().getTime() - day), createdAt: new Date(base + 3) });
    const revoked = await insertRow({ note: "s-revoked", revokedAt: new Date(), createdAt: new Date(base + 4) });

    const rows = await list();

    const status = (id: string) => rows.find((row) => row.id === id)?.status;
    expect(status(active.id)).toBe("active");
    expect(status(usedUp.id)).toBe("used_up");
    expect(status(expired.id)).toBe("expired");
    expect(status(revoked.id)).toBe("revoked");
    expect(rows.slice(0, 4).map((row) => row.id)).toEqual([revoked.id, expired.id, usedUp.id, active.id]);
    const times = rows.map((row) => row.createdAt);
    expect(times).toEqual(times.toSorted().toReversed());
  });

  it("names the creator and reports uses", async () => {
    const used = await insertRow({ note: "partly used", maxUses: 5, useCount: 2 });

    const row = (await list()).find((item) => item.id === used.id);

    expect(row).toMatchObject({ useCount: 2, maxUses: 5, createdByName: "Test boss@amelie.test" });
  });
});

describe("revoke", () => {
  it("revokes, keeps the row and shows it as history", async () => {
    const { inviteCode } = await create({ note: "to revoke" });

    const res = await call(boss.userId, "POST", `/admin/invite-codes/${inviteCode.id}/revoke`);

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toMatchObject({ id: inviteCode.id, status: "revoked" });
    expect(data.revokedAt).not.toBeNull();
    expect((await list()).find((row) => row.id === inviteCode.id)?.status).toBe("revoked");
    expect(await db.select().from(inviteCodes).where(eq(inviteCodes.id, inviteCode.id))).toHaveLength(1);
  });

  it("is idempotent: the second revoke is 200 and keeps the first time", async () => {
    const { inviteCode } = await create();
    const first = (await (await call(boss.userId, "POST", `/admin/invite-codes/${inviteCode.id}/revoke`)).json()).data;

    const again = await call(boss.userId, "POST", `/admin/invite-codes/${inviteCode.id}/revoke`);

    expect(again.status).toBe(200);
    expect((await again.json()).data.revokedAt).toBe(first.revokedAt);
  });

  it("answers 404 for an unknown id and 400 for a bad one", async () => {
    expect((await call(boss.userId, "POST", `/admin/invite-codes/${crypto.randomUUID()}/revoke`)).status).toBe(404);
    expect((await call(boss.userId, "POST", "/admin/invite-codes/nope/revoke")).status).toBe(400);
  });
});

describe("the use_count check", () => {
  it("refuses a use count above max uses", async () => {
    const row = await insertRow({ maxUses: 2, useCount: 2 });

    await expect(db.update(inviteCodes).set({ useCount: 3 }).where(eq(inviteCodes.id, row.id))).rejects.toThrow("Failed query");
    await expect(insertRow({ maxUses: 1, useCount: 2 })).rejects.toThrow("Failed query");
  });

  it("refuses a negative use count and a max uses below one", async () => {
    await expect(insertRow({ useCount: -1 })).rejects.toThrow("Failed query");
    await expect(insertRow({ maxUses: 0 })).rejects.toThrow("Failed query");
  });

  it("refuses two rows with the same hash", async () => {
    await insertRow({ codeHash: "same" });

    await expect(insertRow({ codeHash: "same" })).rejects.toThrow("Failed query");
  });
});
