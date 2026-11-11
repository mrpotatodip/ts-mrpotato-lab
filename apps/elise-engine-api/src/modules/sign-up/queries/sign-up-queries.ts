import { and, asc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import {
  accessMasterPowers,
  accessRolePowers,
  ensureTenantRoles,
  findTenantRole,
  partyRoles,
  platformInviteCodeRedemptions,
  platformInviteCodes,
  tenants,
} from "@repo/db-elise";
import { TENANT_ADMIN_ROLE_KEY, TenantSchema, type Tenant } from "@repo/contracts/elise";
import type { PoolDbType } from "#/lib/db-connection";
import { Conflict, DbError, Forbidden, toDbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import {
  SIGN_UP_EMAIL_TAKEN,
  SIGN_UP_INVALID_INVITE,
  SIGN_UP_SLUG_CANDIDATE_COUNT,
  SIGN_UP_SLUG_CONSTRAINT,
  SIGN_UP_SLUG_EXHAUSTED,
} from "#/modules/sign-up/constants";
import { createPersonLogin } from "#/modules/person-logins";
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
export const pickFreeSlugEffect = (db: PoolDbType, accountName: string): Effect.Effect<string, Conflict | DbError> =>
  Effect.gen(function* () {
    const candidates = slugCandidates(accountName, SIGN_UP_SLUG_CANDIDATE_COUNT);
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
// Person, login, credential, Tenant and its
// tenant_admin membership in one transaction: if
// any step fails, nothing is saved. The first step
// uses the invite code in one UPDATE: it matches a
// code that is not revoked, expired or used up, or
// nothing. Two people racing for the last use: the
// second waits, re-checks and matches nothing. A
// failure later (a taken email, say) rolls the use
// back. A taken email shows only after the code passed.
// -----
export const insertAccountEffect = (
  db: PoolDbType,
  account: NewAccount,
): Effect.Effect<{ userId: string; tenant: Tenant }, SlugTaken | Forbidden | Conflict | DbError> =>
  Effect.gen(function* () {
    const created = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [invite] = await tx
            .update(platformInviteCodes)
            .set({ useCount: sql`${platformInviteCodes.useCount} + 1` })
            .where(
              and(
                eq(platformInviteCodes.codeHash, account.inviteCodeHash),
                isNull(platformInviteCodes.revokedAt),
                or(isNull(platformInviteCodes.expiresAt), gt(platformInviteCodes.expiresAt, account.now)),
                lt(platformInviteCodes.useCount, platformInviteCodes.maxUses),
              ),
            )
            .returning({ id: platformInviteCodes.id });
          if (!invite) throw new InviteRefused();

          const { userId, partyId } = await createPersonLogin(tx, {
            firstName: account.firstName,
            lastName: account.lastName,
            email: account.email,
            passwordHash: account.passwordHash,
          });

          const [tenant] = await tx
            .insert(tenants)
            .values({ partyId, name: account.accountName, slug: account.slug, timezone: account.timezone })
            .returning();
          await ensureTenantRoles(tx, tenant.id);
          const tenantAdminRole = await findTenantRole(tx, tenant.id, TENANT_ADMIN_ROLE_KEY);
          if (!tenantAdminRole) throw new Error(`${TENANT_ADMIN_ROLE_KEY} role missing after ensureTenantRoles`);
          await tx.insert(partyRoles).values({
            partyId,
            tenantId: tenant.id,
            roleId: tenantAdminRole.id,
            roleScope: tenantAdminRole.scope,
          });
          await tx.insert(platformInviteCodeRedemptions).values({
            inviteCodeId: invite.id,
            personPartyId: partyId,
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
    const tenant = yield* Effect.try(() =>
      TenantSchema.parse({ ...created.tenant, role: created.role.key, roleLabel: created.role.label, powers: created.powers }),
    ).pipe(Effect.orDie);
    return { userId: created.userId, tenant };
  });
