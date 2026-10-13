import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { addSuperuser, partyRoles, roles } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getMeSvc } from "#/modules/me";
import { listTenantsSvc } from "#/modules/tenant";
import { createTestDb, insertPersonWithLogin, insertTenant, insertMember } from "#/__tests__/amelie-test-db";

let db: DbConnectType;

beforeAll(async () => {
  db = await createTestDb();
});

const superuserRoles = () => db.select().from(roles).where(eq(roles.key, "superuser"));
const superuserGrants = () => db.select().from(partyRoles).where(eq(partyRoles.roleKey, "superuser"));

describe("addSuperuser", () => {
  it("makes an existing login a superuser and creates the global Role if missing", async () => {
    const login = await insertPersonWithLogin(db, "boss@amelie.test");
    expect(await superuserRoles()).toEqual([]);

    const result = await addSuperuser(db, "boss@amelie.test");

    expect(result).toEqual({ email: "boss@amelie.test", added: true });
    const [role] = await superuserRoles();
    expect(role).toMatchObject({ tenantId: null, canEdit: false });
    expect(await runEffect(getMeSvc(db, login.userId))).toEqual({ isSuperuser: true });
  });

  it("changes nothing when run a second time", async () => {
    await insertPersonWithLogin(db, "twice@amelie.test");
    await addSuperuser(db, "twice@amelie.test");
    const rolesBefore = await superuserRoles();
    const grantsBefore = await superuserGrants();

    const again = await addSuperuser(db, "twice@amelie.test");

    expect(again.added).toBe(false);
    expect(await superuserRoles()).toEqual(rolesBefore);
    expect(await superuserGrants()).toEqual(grantsBefore);
  });

  it("reuses the one global Role for a second superuser", async () => {
    await insertPersonWithLogin(db, "second@amelie.test");
    await addSuperuser(db, "second@amelie.test");

    expect(await superuserRoles()).toHaveLength(1);
  });

  it("refuses an email that has no login, and adds nothing", async () => {
    const before = await superuserGrants();

    await expect(addSuperuser(db, "nobody@amelie.test")).rejects.toThrow("No login has the email");
    expect(await superuserGrants()).toEqual(before);
  });

  it("leaves a login that was never promoted a non-superuser", async () => {
    const plain = await insertPersonWithLogin(db, "plain@amelie.test");
    await addSuperuser(db, "boss@amelie.test");

    expect(await runEffect(getMeSvc(db, plain.userId))).toEqual({ isSuperuser: false });
  });

  it("gives a superuser no cafe: the role lists no Tenant", async () => {
    const cafeId = await insertTenant(db, "Some Cafe", "some-cafe");
    const owner = await insertPersonWithLogin(db, "owner@some-cafe.test");
    await insertMember(db, cafeId, owner.partyId, "owner");
    const boss = await insertPersonWithLogin(db, "boss-no-cafe@amelie.test");
    await addSuperuser(db, "boss-no-cafe@amelie.test");

    expect(await runEffect(listTenantsSvc(db, boss.userId))).toEqual([]);
  });
});
