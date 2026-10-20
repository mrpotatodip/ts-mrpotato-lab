import { and, asc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import {
  authAccount,
  authUser,
  inviteCodeRedemptions,
  inviteCodes,
  organizations,
  parties,
  persons,
  partyRoles,
  accessMasterPowers,
  accessRolePowers,
  ensureTenantRoles,
  findTenantRole,
  tenantCountries,
  tenantLocations,
  tenants,
} from "@repo/db-amelie";
import { TENANT_ADMIN_ROLE_KEY, TenantSchema, type Tenant } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, DbError, Forbidden, toDbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import {
  SIGN_UP_EMAIL_TAKEN,
  SIGN_UP_INVALID_INVITE,
  SIGN_UP_SLUG_CANDIDATE_COUNT,
  SIGN_UP_SLUG_CONSTRAINT,
  SIGN_UP_SLUG_EXHAUSTED,
} from "#/modules/sign-up/constants";
import { slugCandidates } from "#/modules/sign-up/lib";
import type { NewAccount } from "#/modules/sign-up/types";

// -----
// Stays inside this module: the service catches
// it by tag to pick a new slug and try again.
// -----
export class SlugTaken extends Data.TaggedError("SlugTaken")<{ cause: unknown }> {}

// -----
// The first address from the name that no
// Tenant has. This is a friendly pick; the
// unique index is the real guard.
// -----
export const pickFreeSlugEffect = (
  db: DbConnectType,
  cafeName: string,
): Effect.Effect<string, Conflict | DbError> =>
  Effect.gen(function* () {
    const candidates = slugCandidates(cafeName, SIGN_UP_SLUG_CANDIDATE_COUNT);
    const rows = yield* Effect.tryPromise({
      try: () => db.select({ slug: tenants.slug }).from(tenants).where(inArray(tenants.slug, candidates)),
      catch: toDbError,
    });
    const taken = new Set(rows.map((row) => row.slug));
    const free = candidates.find((candidate) => !taken.has(candidate));
    if (!free) return yield* new Conflict({ message: SIGN_UP_SLUG_EXHAUSTED });
    return free;
  });

// -----
// Thrown inside the transaction when the code
// matches nothing; it rolls everything back.
// -----
class InviteRefused extends Data.TaggedError("InviteRefused") {}

const classifyInsertFailure = (cause: unknown): SlugTaken | Forbidden | Conflict | DbError => {
  if (cause instanceof InviteRefused) return new Forbidden({ message: SIGN_UP_INVALID_INVITE });
  if (pgErrorCode(cause) !== PG_UNIQUE_VIOLATION) return toDbError(cause);
  return pgErrorConstraint(cause) === SIGN_UP_SLUG_CONSTRAINT
    ? new SlugTaken({ cause })
    : new Conflict({ message: SIGN_UP_EMAIL_TAKEN });
};

// -----
// Person, login, credential, Organization, Tenant,
// its default Location and owner membership in one transaction: if any
// step fails, nothing is saved. The first step uses
// the invite code in one UPDATE: it matches a code
// that is not revoked, expired or used up, or
// nothing. Two people racing for the last use: the
// second waits, re-checks and matches nothing. A
// failure later (a taken email, say) rolls the use
// back. A taken email shows only after the code passed.
// -----
export const insertAccountEffect = (
  db: DbConnectType,
  account: NewAccount,
): Effect.Effect<{ userId: string; tenant: Tenant }, SlugTaken | Forbidden | Conflict | DbError> =>
  Effect.gen(function* () {
    const created = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [invite] = await tx
            .update(inviteCodes)
            .set({ useCount: sql`${inviteCodes.useCount} + 1` })
            .where(
              and(
                eq(inviteCodes.codeHash, account.inviteCodeHash),
                isNull(inviteCodes.revokedAt),
                or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, account.now)),
                lt(inviteCodes.useCount, inviteCodes.maxUses),
              ),
            )
            .returning({ id: inviteCodes.id });
          if (!invite) throw new InviteRefused();

          const [personParty] = await tx.insert(parties).values({ type: "person" }).returning();
          await tx.insert(persons).values({
            partyId: personParty.id,
            firstName: account.firstName,
            lastName: account.lastName,
          });

          const userId = crypto.randomUUID();
          await tx.insert(authUser).values({
            id: userId,
            name: `${account.firstName} ${account.lastName}`,
            email: account.email,
            emailVerified: false,
            partyId: personParty.id,
          });
          await tx.insert(authAccount).values({
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: account.passwordHash,
          });

          const [organizationParty] = await tx.insert(parties).values({ type: "organization" }).returning();
          await tx.insert(organizations).values({ partyId: organizationParty.id, name: account.cafeName });
          const [tenant] = await tx
            .insert(tenants)
            .values({
              organizationPartyId: organizationParty.id,
              name: account.cafeName,
              slug: account.slug,
              timezone: account.timezone,
              allowedOrigins: account.allowedOrigins,
            })
            .returning();
          const [country] = await tx
            .insert(tenantCountries)
            .values({ tenantId: tenant.id, country: account.country, currency: account.currency })
            .returning({ id: tenantCountries.id });
          await tx.insert(tenantLocations).values({
            tenantId: tenant.id,
            countryId: country.id,
            name: account.cafeName,
            slug: account.slug,
            timezone: account.timezone,
          });
          await ensureTenantRoles(tx, tenant.id);
          const tenantAdminRole = await findTenantRole(tx, tenant.id, TENANT_ADMIN_ROLE_KEY);
          if (!tenantAdminRole) throw new Error(`${TENANT_ADMIN_ROLE_KEY} role missing after ensureTenantRoles`);
          await tx.insert(partyRoles).values({
            partyId: personParty.id,
            tenantId: tenant.id,
            roleId: tenantAdminRole.id,
            roleScope: tenantAdminRole.scope,
          });
          await tx.insert(inviteCodeRedemptions).values({
            inviteCodeId: invite.id,
            personPartyId: personParty.id,
            tenantId: tenant.id,
            redeemedAt: account.now,
          });

          const granted = await tx
            .select({ power: accessMasterPowers.power })
            .from(accessRolePowers)
            .innerJoin(accessMasterPowers, eq(accessMasterPowers.id, accessRolePowers.masterPowerId))
            .where(eq(accessRolePowers.masterRoleId, tenantAdminRole.masterRoleId))
            .orderBy(asc(accessMasterPowers.power));

          return { userId, tenant, role: tenantAdminRole, powers: granted.map((row) => row.power) };
        }),
      catch: classifyInsertFailure,
    });
    // -----
    // Our own row, just written: a parse failure
    // is a bug, not something a caller can fix.
    // -----
    const tenant = yield* Effect.try(() => TenantSchema.parse({ ...created.tenant, country: account.country, currency: account.currency, role: created.role.key, roleLabel: created.role.label, powers: created.powers, coverage: "all" })).pipe(
      Effect.orDie,
    );
    return { userId: created.userId, tenant };
  });
