import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser, ensureTenantRoles, findTenantRole, partyRoles, tenantGroupMembers, tenantGroups, tenantTeamInvites } from "@repo/db-elise";
import { TENANT_ADMIN_ROLE_KEY } from "@repo/contracts/elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { acceptInviteEffect, createInviteEffect, inviteEmailContextEffect, listTeamEffect, previewInviteEffect, revokeInviteEffect } from "#/modules/team/queries";
import type { NewInvite } from "#/modules/team/types";

let test: TestDb;
let tenantId: string;
let adminUserId: string;
let adminPartyId: string;
let groupId: string;
let otherTenantGroupId: string;

const NOW = new Date("2026-11-08T00:00:00Z");
const LATER = new Date("2026-11-15T00:00:00Z");

const invite = (overrides: Partial<NewInvite> = {}): NewInvite => ({
  tenantId,
  actorUserId: adminUserId,
  email: "new@example.com",
  roleKey: "workspace_member",
  groupIds: [],
  tokenHash: crypto.randomUUID(),
  now: NOW,
  expiresAt: LATER,
  ...overrides,
});

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

const accept = (tokenHash: string, extra: Partial<Parameters<typeof acceptInviteEffect>[1]> = {}) =>
  acceptInviteEffect(test.pool, {
    tokenHash,
    now: NOW,
    signedInUserId: undefined,
    newLogin: { firstName: "Bo", lastName: "Chen", passwordHash: "hash" },
    ...extra,
  });

beforeAll(async () => {
  test = await openTestDb();
  const seeded = await seedTenant(test, "acme");
  tenantId = seeded.tenantId;
  adminPartyId = seeded.partyId;
  await ensureTenantRoles(test.raw, tenantId);
  const adminRole = await findTenantRole(test.raw, tenantId, TENANT_ADMIN_ROLE_KEY);
  if (!adminRole) throw new Error("tenant_admin role missing");
  adminUserId = "admin-user";
  await test.raw.insert(authUser).values({ id: adminUserId, name: "Ada Rossi", email: "ada@example.com", partyId: adminPartyId });
  await test.raw.insert(partyRoles).values({ partyId: adminPartyId, tenantId, roleId: adminRole.id, roleScope: "tenant" });
  [{ id: groupId }] = await test.raw.insert(tenantGroups).values({ tenantId, name: "Backend" }).returning();
  const other = await seedTenant(test, "other");
  [{ id: otherTenantGroupId }] = await test.raw.insert(tenantGroups).values({ tenantId: other.tenantId, name: "Backend" }).returning();
});

afterAll(async () => {
  await test.close();
});

describe("createInviteEffect", () => {
  it("saves a pending invite with its Groups and lists it", async () => {
    const created = await run(createInviteEffect(test.pool, invite({ email: "listed@example.com", groupIds: [groupId, groupId] })));

    expect(created).toMatchObject({ email: "listed@example.com", role: "workspace_member", groupIds: [groupId] });
    const team = await run(listTeamEffect(test.http, tenantId, NOW));
    expect(team.invites.map((row) => row.email)).toContain("listed@example.com");
    expect(team.members).toEqual([expect.objectContaining({ partyId: adminPartyId, role: "tenant_admin", groupIds: [] })]);
  });

  it("refuses tenant_admin, an unknown role and a Group of another Tenant", async () => {
    expect(await fail(createInviteEffect(test.pool, invite({ roleKey: "tenant_admin" })))).toMatchObject({ _tag: "Invalid" });
    expect(await fail(createInviteEffect(test.pool, invite({ roleKey: "nope" })))).toMatchObject({ _tag: "Invalid" });
    expect(await fail(createInviteEffect(test.pool, invite({ groupIds: [otherTenantGroupId] })))).toMatchObject({ _tag: "Invalid" });
  });

  it("refuses someone who already holds a Role, whatever the email's case", async () => {
    const error = await fail(createInviteEffect(test.pool, invite({ email: "ada@example.com" })));

    expect(error).toMatchObject({ _tag: "Conflict" });
  });

  it("replaces the pending invite for the same email, so only the newest link works", async () => {
    const first = invite({ email: "twice@example.com" });
    const second = invite({ email: "twice@example.com" });
    await run(createInviteEffect(test.pool, first));
    await run(createInviteEffect(test.pool, second));

    expect(await fail(accept(first.tokenHash))).toMatchObject({ _tag: "Forbidden" });
    expect(await run(accept(second.tokenHash))).toEqual({ tenantId });
  });
});

describe("inviteEmailContextEffect", () => {
  it("gives the account name and the inviter's name, and falls back when either is missing", async () => {
    expect(await run(inviteEmailContextEffect(test.pool, tenantId, adminUserId))).toEqual({ accountName: "acme", inviterName: "Ada Rossi" });
    expect(await run(inviteEmailContextEffect(test.pool, crypto.randomUUID(), "nobody"))).toEqual({ accountName: "your team", inviterName: "A teammate" });
  });
});

describe("revokeInviteEffect", () => {
  it("revokes a pending invite once, then reports NotFound", async () => {
    const created = await run(createInviteEffect(test.pool, invite({ email: "revoke@example.com" })));

    expect(await run(revokeInviteEffect(test.pool, tenantId, created.id, adminUserId, NOW))).toEqual({ id: created.id });
    expect(await fail(revokeInviteEffect(test.pool, tenantId, created.id, adminUserId, NOW))).toMatchObject({ _tag: "NotFound" });
  });

  it("cannot reach an invite of another Tenant", async () => {
    const created = await run(createInviteEffect(test.pool, invite({ email: "scoped@example.com" })));
    const other = await seedTenant(test, "third");

    expect(await fail(revokeInviteEffect(test.pool, other.tenantId, created.id, adminUserId, NOW))).toMatchObject({ _tag: "NotFound" });
  });
});

describe("previewInviteEffect", () => {
  it("shows the account, Role and whether a login exists, but not the email", async () => {
    const pending = invite({ email: "ada@example.com" });
    await test.raw.insert(tenantTeamInvites).values({
      tenantId,
      email: pending.email,
      roleId: (await findTenantRole(test.raw, tenantId, "workspace_member"))!.id,
      tokenHash: pending.tokenHash,
      invitedBy: adminPartyId,
      expiresAt: LATER,
    });

    const preview = await run(previewInviteEffect(test.http, pending.tokenHash, NOW));

    expect(preview).toEqual({ accountName: "acme", role: "workspace_member", roleLabel: expect.any(String), hasAccount: true });
  });

  it("answers one generic error for an unknown, expired or revoked token", async () => {
    const expired = invite({ email: "old@example.com", expiresAt: new Date("2026-11-01T00:00:00Z") });
    await run(createInviteEffect(test.pool, { ...expired, now: new Date("2026-10-25T00:00:00Z") }));

    for (const tokenHash of ["unknown", expired.tokenHash]) {
      expect(await fail(previewInviteEffect(test.http, tokenHash, NOW))).toMatchObject({ _tag: "Forbidden", message: "This invite is invalid or has expired" });
    }
  });
});

describe("acceptInviteEffect", () => {
  it("makes a login, gives the Role and joins the Groups", async () => {
    const pending = invite({ email: "Bo@Example.com".toLowerCase(), groupIds: [groupId] });
    await run(createInviteEffect(test.pool, pending));

    expect(await run(accept(pending.tokenHash))).toEqual({ tenantId });

    const [login] = await test.raw.select().from(authUser).where(eq(authUser.email, "bo@example.com"));
    expect(login.name).toBe("Bo Chen");
    expect(await test.raw.select().from(partyRoles).where(eq(partyRoles.partyId, login.partyId))).toHaveLength(1);
    expect(await test.raw.select().from(tenantGroupMembers).where(eq(tenantGroupMembers.partyId, login.partyId))).toHaveLength(1);
  });

  it("cannot be used twice", async () => {
    const pending = invite({ email: "once@example.com" });
    await run(createInviteEffect(test.pool, pending));
    await run(accept(pending.tokenHash));

    expect(await fail(accept(pending.tokenHash))).toMatchObject({ _tag: "Forbidden" });
  });

  it("needs the name and password for a new login, and gives the invite back when it fails", async () => {
    const pending = invite({ email: "details@example.com" });
    await run(createInviteEffect(test.pool, pending));

    expect(await fail(accept(pending.tokenHash, { newLogin: undefined }))).toMatchObject({ _tag: "Invalid" });
    expect(await run(accept(pending.tokenHash))).toEqual({ tenantId });
  });

  it("makes an existing login sign in as the invited email first", async () => {
    const otherTenant = await seedTenant(test, "joiner");
    await test.raw.insert(authUser).values({ id: "joiner", name: "Jo", email: "jo@example.com", partyId: otherTenant.partyId });
    const pending = invite({ email: "jo@example.com" });
    await run(createInviteEffect(test.pool, pending));

    expect(await fail(accept(pending.tokenHash))).toMatchObject({ _tag: "Forbidden", message: "Sign in with the invited email to accept this invite" });
    expect(await fail(accept(pending.tokenHash, { signedInUserId: adminUserId }))).toMatchObject({ _tag: "Forbidden" });
    expect(await run(accept(pending.tokenHash, { signedInUserId: "joiner" }))).toEqual({ tenantId });
  });

  it("refuses when the Role was disabled after the invite was made", async () => {
    const pending = invite({ email: "stale@example.com", roleKey: "workspace_admin" });
    await run(createInviteEffect(test.pool, pending));
    await test.raw.execute(`update access_master_roles set enabled = false where key = 'workspace_admin'`);

    expect(await fail(accept(pending.tokenHash))).toMatchObject({ _tag: "Forbidden" });
    await test.raw.execute(`update access_master_roles set enabled = true where key = 'workspace_admin'`);
  });
});
