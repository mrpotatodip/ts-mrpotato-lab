import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessAuditLog, authUser, ensureTenantRoles, findTenantRole, partyRoles, tenantGroupMembers } from "@repo/db-elise";
import { GROUP_LIMIT_PER_TENANT } from "@repo/contracts/elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import {
  addGroupMemberEffect,
  createGroupEffect,
  deleteGroupEffect,
  listGroupsEffect,
  removeGroupMemberEffect,
  renameGroupEffect,
} from "#/modules/groups/queries";

let test: TestDb;
let tenantId: string;
let partyId: string;
let outsiderPartyId: string;
const USER = "admin-user";

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));
const create = (name: string) => run(createGroupEffect(test.pool, tenantId, USER, name));

beforeAll(async () => {
  test = await openTestDb();
  const seeded = await seedTenant(test, "acme");
  tenantId = seeded.tenantId;
  partyId = seeded.partyId;
  outsiderPartyId = (await seedTenant(test, "outsider")).partyId;
  await ensureTenantRoles(test.raw, tenantId);
  const role = await findTenantRole(test.raw, tenantId, "tenant_admin");
  await test.raw.insert(authUser).values({ id: USER, name: "Ada Rossi", email: "ada@example.com", partyId });
  await test.raw.insert(partyRoles).values({ partyId, tenantId, roleId: role!.id, roleScope: "tenant" });
});

afterAll(async () => {
  await test.close();
});

describe("groups", () => {
  it("creates a Group, refuses the same name in any case, and lists it", async () => {
    const group = await create("Backend");

    expect(group).toMatchObject({ name: "Backend", memberIds: [] });
    expect(await fail(createGroupEffect(test.pool, tenantId, USER, "BACKEND"))).toMatchObject({ _tag: "Conflict" });
    expect((await run(listGroupsEffect(test.http, tenantId))).map((row) => row.name)).toEqual(["Backend"]);
  });

  it("lets two Tenants use the same name", async () => {
    const other = await seedTenant(test, "second");
    const created = await run(createGroupEffect(test.pool, other.tenantId, USER, "Backend"));

    expect(created.name).toBe("Backend");
  });

  it("renames, and refuses a rename onto an existing name", async () => {
    const group = await create("Ops");

    expect(await run(renameGroupEffect(test.pool, tenantId, USER, group.id, "Platform"))).toMatchObject({ name: "Platform" });
    expect(await fail(renameGroupEffect(test.pool, tenantId, USER, group.id, "backend"))).toMatchObject({ _tag: "Conflict" });
  });

  it("adds a member twice without a clash, and removes them", async () => {
    const group = await create("Design");

    await run(addGroupMemberEffect(test.pool, tenantId, USER, group.id, partyId));
    await run(addGroupMemberEffect(test.pool, tenantId, USER, group.id, partyId));
    expect((await run(listGroupsEffect(test.http, tenantId))).find((row) => row.id === group.id)?.memberIds).toEqual([partyId]);

    await run(removeGroupMemberEffect(test.pool, tenantId, USER, group.id, partyId));
    expect(await fail(removeGroupMemberEffect(test.pool, tenantId, USER, group.id, partyId))).toMatchObject({ _tag: "NotFound" });
  });

  it("refuses someone with no Role in the Tenant", async () => {
    const group = await create("Sales");

    expect(await fail(addGroupMemberEffect(test.pool, tenantId, USER, group.id, outsiderPartyId))).toMatchObject({ _tag: "NotFound" });
  });

  it("cannot touch a Group of another Tenant", async () => {
    const group = await create("Legal");
    const other = await seedTenant(test, "third");

    expect(await fail(deleteGroupEffect(test.pool, other.tenantId, USER, group.id))).toMatchObject({ _tag: "NotFound" });
    expect(await fail(renameGroupEffect(test.pool, other.tenantId, USER, group.id, "x"))).toMatchObject({ _tag: "NotFound" });
  });

  it("deletes a Group and its memberships but keeps the person", async () => {
    const group = await create("Temp");
    await run(addGroupMemberEffect(test.pool, tenantId, USER, group.id, partyId));
    await run(deleteGroupEffect(test.pool, tenantId, USER, group.id));

    expect(await test.raw.select().from(tenantGroupMembers).where(eq(tenantGroupMembers.groupId, group.id))).toHaveLength(0);
    expect(await test.raw.select().from(partyRoles).where(eq(partyRoles.partyId, partyId))).toHaveLength(1);
  });

  it("writes an audit row for each change, naming the actor and the Tenant", async () => {
    const rows = await test.raw.select().from(accessAuditLog);
    const created = rows.find((row) => row.action === "group.created");

    expect(created).toMatchObject({ actorPartyId: partyId, after: { tenantId } });
    expect(rows.map((row) => row.action)).toEqual(expect.arrayContaining(["group.renamed", "group.member.added", "group.member.removed", "group.deleted"]));
  });

  it("stops at the Group limit", async () => {
    const other = await seedTenant(test, "capped");
    for (let n = 0; n < GROUP_LIMIT_PER_TENANT; n++) await run(createGroupEffect(test.pool, other.tenantId, USER, `g${n}`));

    expect(await fail(createGroupEffect(test.pool, other.tenantId, USER, "one more"))).toMatchObject({ _tag: "Conflict" });
  });
});
