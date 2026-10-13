import { desc, eq, and, isNull, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import { authUser, inviteCodes, persons } from "@repo/db-amelie";
import { InviteCodeSchema, type InviteCode } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { INVITE_CODE_CREATOR_UNKNOWN, INVITE_CODE_NOT_FOUND } from "#/modules/invite-code/constants";
import { deriveInviteCodeStatus } from "#/modules/invite-code/lib";
import type { NewInviteCode } from "#/modules/invite-code/types";

const summaryColumns = {
  id: inviteCodes.id,
  note: inviteCodes.note,
  maxUses: inviteCodes.maxUses,
  useCount: inviteCodes.useCount,
  expiresAt: inviteCodes.expiresAt,
  revokedAt: inviteCodes.revokedAt,
  createdAt: inviteCodes.createdAt,
  firstName: persons.firstName,
  lastName: persons.lastName,
  email: authUser.email,
};

// -----
// Never selects code_hash: no row that leaves
// this file can carry it.
// -----
const selectSummaries = (db: DbConnectType, where?: SQL) =>
  db
    .select(summaryColumns)
    .from(inviteCodes)
    .innerJoin(persons, eq(persons.partyId, inviteCodes.createdBy))
    .leftJoin(authUser, eq(authUser.partyId, inviteCodes.createdBy))
    .where(where)
    .orderBy(desc(inviteCodes.createdAt), desc(inviteCodes.id));

type SummaryRow = Awaited<ReturnType<typeof selectSummaries>>[number];

const creatorName = (row: SummaryRow): string =>
  `${row.firstName} ${row.lastName}`.trim() || row.email || INVITE_CODE_CREATOR_UNKNOWN;

const toInviteCode = (row: SummaryRow, now: Date): InviteCode =>
  InviteCodeSchema.parse({
    id: row.id,
    note: row.note,
    status: deriveInviteCodeStatus(row, now),
    useCount: row.useCount,
    maxUses: row.maxUses,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdByName: creatorName(row),
  });

const parseOwnRows = (rows: SummaryRow[]): Effect.Effect<InviteCode[]> => {
  const now = new Date();
  return Effect.try(() => rows.map((row) => toInviteCode(row, now))).pipe(Effect.orDie);
};

export const findPartyIdByUserIdEffect = (
  db: DbConnectType,
  userId: string,
): Effect.Effect<string, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => db.select({ partyId: authUser.partyId }).from(authUser).where(eq(authUser.id, userId)).limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: INVITE_CODE_NOT_FOUND });
    return row.partyId;
  });

export const insertInviteCodeEffect = (
  db: DbConnectType,
  invite: NewInviteCode,
): Effect.Effect<string, DbError> =>
  Effect.tryPromise({
    try: () => db.insert(inviteCodes).values(invite).returning({ id: inviteCodes.id }),
    catch: toDbError,
  }).pipe(Effect.map(([row]) => row.id));

export const listInviteCodesEffect = (db: DbConnectType): Effect.Effect<InviteCode[], DbError> =>
  Effect.tryPromise({ try: () => selectSummaries(db), catch: toDbError }).pipe(
    Effect.flatMap(parseOwnRows),
  );

export const getInviteCodeEffect = (
  db: DbConnectType,
  id: string,
): Effect.Effect<InviteCode, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => selectSummaries(db, eq(inviteCodes.id, id)).limit(1),
      catch: toDbError,
    });
    const [invite] = yield* parseOwnRows(rows);
    if (!invite) return yield* new NotFound({ message: INVITE_CODE_NOT_FOUND });
    return invite;
  });

// -----
// Only a code that is not revoked yet gets a new
// timestamp, so revoking twice keeps the first.
// -----
export const revokeInviteCodeEffect = (
  db: DbConnectType,
  id: string,
  now: Date,
): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(inviteCodes)
        .set({ revokedAt: now })
        .where(and(eq(inviteCodes.id, id), isNull(inviteCodes.revokedAt))),
    catch: toDbError,
  }).pipe(Effect.asVoid);
