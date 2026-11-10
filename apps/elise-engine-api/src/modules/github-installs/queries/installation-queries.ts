import { and, asc, eq, ne } from "drizzle-orm";
import { Data, Effect } from "effect";
import { tenantGithubInstallations, type TTenantGithubInstallation } from "@repo/db-elise";
import { GithubInstallationSchema, type GithubInstallation } from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Conflict, Forbidden, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "#/lib/pg-error";
import { actorPartyOf, insertAuditEntry } from "#/modules/audit-trail";
import type { GithubInstallationInfo } from "#/modules/github-app";
import { GITHUB_INSTALL_NOT_FOUND, GITHUB_INSTALL_TAKEN } from "#/modules/github-installs/constants";
import type { InstallationRepo, NewInstallation } from "#/modules/github-installs/types";

export const neonInstallationRepo = (db: DbConnectType): InstallationRepo => ({
  findActive: (accountId, installationId) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db
          .select({ id: tenantGithubInstallations.id, installationId: tenantGithubInstallations.installationId })
          .from(tenantGithubInstallations)
          .where(
            and(
              eq(tenantGithubInstallations.tenantId, accountId),
              eq(tenantGithubInstallations.provider, "github"),
              eq(tenantGithubInstallations.installationId, installationId),
              eq(tenantGithubInstallations.status, "active"),
            ),
          );
        return row ?? null;
      },
      catch: toDbError,
    }),
});

const toInstallation = (row: TTenantGithubInstallation): GithubInstallation =>
  GithubInstallationSchema.parse({
    id: row.id,
    installationId: row.installationId,
    accountLogin: row.accountLogin,
    repositorySelection: row.repositorySelection,
    status: row.status,
    connectedAt: row.createdAt.toISOString(),
    checkedAt: row.checkedAt?.toISOString() ?? null,
    manageUrl: row.htmlUrl,
  });

// -----
// The installs of one Account, oldest first. The status is what the
// last check saw: there is no webhook to keep it fresh.
// -----
export const listInstallationsEffect = (db: DbConnectType, tenantId: string, activeOnly = false): Effect.Effect<GithubInstallation[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select()
        .from(tenantGithubInstallations)
        .where(and(eq(tenantGithubInstallations.tenantId, tenantId), activeOnly ? eq(tenantGithubInstallations.status, "active") : undefined))
        .orderBy(asc(tenantGithubInstallations.createdAt)),
    catch: toDbError,
  }).pipe(Effect.flatMap((rows) => Effect.try(() => rows.map(toInstallation)).pipe(Effect.orDie)));

// -----
// Thrown inside a transaction to roll it back.
// -----
class Refused extends Data.TaggedError("Refused")<{ failure: Conflict | Forbidden }> {}

const refuse = (failure: Conflict | Forbidden): never => {
  throw new Refused({ failure });
};

const classify = (cause: unknown): Conflict | Forbidden | DbError => {
  if (cause instanceof Refused) return cause.failure;
  return pgErrorCode(cause) === PG_UNIQUE_VIOLATION ? new Conflict({ message: GITHUB_INSTALL_TAKEN }) : toDbError(cause);
};

// -----
// Save an install for an Account, and write who did it to the audit
// trail in the same transaction. An install already held by another
// Account is refused: one install belongs to one Account. The same
// Account connecting it again refreshes the row, so a second visit or
// a retry is harmless.
// -----
export const connectInstallationEffect = (db: PoolDbType, input: NewInstallation): Effect.Effect<GithubInstallation, Conflict | Forbidden | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorPartyOf(tx, input.userId);
        if (!actorPartyId) return refuse(new Forbidden({ message: "Forbidden" }));

        const [existing] = await tx
          .select({ id: tenantGithubInstallations.id, tenantId: tenantGithubInstallations.tenantId })
          .from(tenantGithubInstallations)
          .where(and(eq(tenantGithubInstallations.provider, "github"), eq(tenantGithubInstallations.installationId, input.installationId)));
        if (existing && existing.tenantId !== input.tenantId) return refuse(new Conflict({ message: GITHUB_INSTALL_TAKEN }));

        const fresh = {
          accountLogin: input.info.accountLogin,
          repositorySelection: input.info.repositorySelection,
          htmlUrl: input.info.htmlUrl,
          status: input.info.suspended ? "suspended" : "active",
          noticeAcceptedAt: input.now,
          checkedAt: input.now,
        };
        const [row] = existing
          ? await tx
              .update(tenantGithubInstallations)
              .set(fresh)
              .where(and(eq(tenantGithubInstallations.id, existing.id), eq(tenantGithubInstallations.tenantId, input.tenantId)))
              .returning()
          : await tx.insert(tenantGithubInstallations).values({ tenantId: input.tenantId, installationId: input.installationId, connectedBy: actorPartyId, ...fresh }).returning();
        await insertAuditEntry(tx, {
          actorPartyId,
          action: "github.install.connected",
          subjectId: row.id,
          tenantId: input.tenantId,
          after: {
            installationId: input.installationId,
            accountLogin: input.info.accountLogin,
            repositorySelection: input.info.repositorySelection,
            noticeAcceptedAt: input.now.toISOString(),
            reconnected: existing !== undefined,
          },
        });
        return row;
      }),
    catch: classify,
  }).pipe(Effect.flatMap((row) => Effect.try(() => toInstallation(row)).pipe(Effect.orDie)));

// -----
// What a check of GitHub found. Null: GitHub has no such install any
// more, so it is removed. A removed install is never revived here: a
// new install of the App has a new number and goes through Connect.
// -----
export const saveInstallationCheckEffect = (db: DbConnectType, tenantId: string, id: string, info: GithubInstallationInfo | null, now: Date): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(tenantGithubInstallations)
        .set(
          info === null
            ? { status: "removed", checkedAt: now }
            : {
                accountLogin: info.accountLogin,
                repositorySelection: info.repositorySelection,
                htmlUrl: info.htmlUrl,
                status: info.suspended ? "suspended" : "active",
                checkedAt: now,
              },
        )
        .where(and(eq(tenantGithubInstallations.id, id), eq(tenantGithubInstallations.tenantId, tenantId), ne(tenantGithubInstallations.status, "removed"))),
    catch: toDbError,
  }).pipe(Effect.asVoid);

// -----
// An admin stops EliseLAB using an install. The row stays, so the scans
// that used it keep their link, and the audit trail says who did it.
// Disconnecting twice is harmless. It cannot take access away on
// GitHub: only an uninstall there does that.
// -----
export const disconnectInstallationEffect = (db: PoolDbType, tenantId: string, userId: string, id: string): Effect.Effect<GithubInstallation, NotFound | Forbidden | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorPartyOf(tx, userId);
        if (!actorPartyId) return refuse(new Forbidden({ message: "Forbidden" }));

        const [row] = await tx
          .select()
          .from(tenantGithubInstallations)
          .where(and(eq(tenantGithubInstallations.id, id), eq(tenantGithubInstallations.tenantId, tenantId)));
        if (!row) return null;
        if (row.status === "removed") return row;

        const [removed] = await tx
          .update(tenantGithubInstallations)
          .set({ status: "removed" })
          .where(and(eq(tenantGithubInstallations.id, id), eq(tenantGithubInstallations.tenantId, tenantId)))
          .returning();
        await insertAuditEntry(tx, {
          actorPartyId,
          action: "github.install.removed",
          subjectId: removed.id,
          tenantId,
          after: { installationId: removed.installationId, accountLogin: removed.accountLogin },
        });
        return removed;
      }),
    catch: (cause) => {
      const failure = classify(cause);
      return failure._tag === "Conflict" ? toDbError(cause) : failure;
    },
  }).pipe(
    Effect.flatMap((row) => (row === null ? Effect.fail(new NotFound({ message: GITHUB_INSTALL_NOT_FOUND })) : Effect.try(() => toInstallation(row)).pipe(Effect.orDie))),
  );
