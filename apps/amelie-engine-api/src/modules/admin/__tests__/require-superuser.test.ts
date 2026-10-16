import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { addSuperuser } from "@repo/db-amelie";

import type { DbConnectType } from "#/lib/db-connection";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { getTenantSvc } from "#/modules/tenant/handlers";
import { runEffect } from "#/lib/effect-query";
import { TENANT_NOT_FOUND } from "#/modules/tenant/constants";
import { createRequireSuperuser } from "#/modules/admin";
import { createTestDb, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;

const requireSuperuser = createRequireSuperuser(() => db);

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
app.get("/admin", requireSuperuser, (c) => c.json({ data: { ok: true }, error: null }));

// SAFETY: the connection is injected, so no binding is read.
const env = { HYPERDRIVE_REALTIME: { connectionString: "unused" } } as never;

const asUser = (userId: string, path = "/admin") =>
  app.fetch(new Request(`http://localhost${path}`, { headers: { "x-user-id": userId } }), env);

let cafeId: string;
// SAFETY: beforeAll fills every key before a test reads it.
const users = {} as Record<string, string>;

beforeAll(async () => {
  db = await createTestDb();
  cafeId = await insertTenant(db, "Sorella Cafe", "sorella");
  for (const key of ["tenant_admin", "store_admin", "store_staff"] as const) {
    const login = await insertPersonWithLogin(db, `${key}@sorella.test`);
    await insertMember(db, cafeId, login.partyId, key);
    users[key] = login.userId;
  }
  users.none = (await insertPersonWithLogin(db, "none@sorella.test")).userId;
  const boss = await insertPersonWithLogin(db, "boss@amelie.test");
  await addSuperuser(db, "boss@amelie.test");
  users.superuser = boss.userId;
});

describe("requireSuperuser", () => {
  it("lets a superuser through", async () => {
    const res = await asUser(users.superuser);

    expect(res.status).toBe(200);
  });

  it.each(["tenant_admin", "store_admin", "store_staff", "none"] as const)("answers not found for %s, never forbidden", async (who) => {
    const res = await asUser(users[who]);

    expect(res.status).toBe(404);
  });

  it("answers not found for a user id that has no login", async () => {
    const res = await asUser("no-such-user");

    expect(res.status).toBe(404);
  });
});

describe("a superuser's role", () => {
  it("grants no access to a cafe's data", async () => {
    await expect(runEffect(getTenantSvc(db, users.superuser, cafeId))).rejects.toThrow(TENANT_NOT_FOUND);

    await expect(runEffect(getTenantSvc(db, users.tenant_admin, cafeId))).resolves.toMatchObject({ role: "tenant_admin" });
  });
});
