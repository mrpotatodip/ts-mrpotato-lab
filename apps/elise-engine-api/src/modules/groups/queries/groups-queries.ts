import { and, asc, eq, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import { partyRoles, tenantGroupMembers, tenantGroups } from "@repo/db-elise";
import {
  GROUP_LIMIT_PER_TENANT,
  GROUP_MEMBER_LIMIT,
  type Group,
  type GroupDeleted,
  type GroupList,
  type GroupMember,
} from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Conflict, DbError, Forbidden, NotFound, toDbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import { actorPartyOf, insertAuditEntry } from "#/modules/audit-trail";
import type { GroupFailure } from "#/modules/groups/types";
import { GROUP_FULL, GROUP_NAME_CONSTRAINT, GROUP_LIMIT_REACHED, GROUP_NAME_TAKEN, GROUP_NOT_FOUND, GROUP_PERSON_NOT_FOUND } from "#/modules/groups/constants";

class Refused extends Data.TaggedError("Refused")<{ failure: Conflict | Forbidden | NotFound }> {}

const refuse = (failure: Conflict | Forbidden | NotFound): never => {
  throw new Refused({ failure });
};

const classify = (cause: unknown): GroupFailure => {
  if (cause instanceof Refused) return cause.failure;
  if (pgErrorCode(cause) === PG_UNIQUE_VIOLATION && pgErrorConstraint(cause) === GROUP_NAME_CONSTRAINT) return new Conflict({ message: GROUP_NAME_TAKEN });
  return toDbError(cause);
};

const toGroup = (row: typeof tenantGroups.$inferSelect, memberIds: string[]): Group => ({
  id: row.id,
  name: row.name,
  memberIds,
  createdAt: row.createdAt.toISOString(),
});

// -----
// Every Group of the Tenant with who is in it.
// -----
export const listGroupsEffect = (db: DbConnectType, tenantId: string): Effect.Effect<GroupList, DbError> =>
  Effect.gen(function* () {
    const groups = yield* Effect.tryPromise({
      try: () => db.select().from(tenantGroups).where(eq(tenantGroups.tenantId, tenantId)).orderBy(asc(tenantGroups.name)),
      catch: toDbError,
    });
    const members = yield* Effect.tryPromise({
      try: () => db.select().from(tenantGroupMembers).where(eq(tenantGroupMembers.tenantId, tenantId)),
      catch: toDbError,
    });
    return groups.map((group) =>
      toGroup(
        group,
        members.filter((member) => member.groupId === group.id).map((member) => member.partyId),
      ),
    );
  });

const groupOf = async (tx: Pick<PoolDbType, "select">, tenantId: string, groupId: string) => {
  const [group] = await tx
    .select()
    .from(tenantGroups)
    .where(and(eq(tenantGroups.id, groupId), eq(tenantGroups.tenantId, tenantId)));
  return group ?? refuse(new NotFound({ message: GROUP_NOT_FOUND }));
};

const actorOf = async (tx: Pick<PoolDbType, "select">, userId: string) =>
  (await actorPartyOf(tx, userId)) ?? refuse(new Forbidden({ message: "Forbidden" }));

export const createGroupEffect = (db: PoolDbType, tenantId: string, userId: string, name: string): Effect.Effect<Group, GroupFailure> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorOf(tx, userId);
        const [{ total }] = await tx
          .select({ total: sql<number>`count(*)::int` })
          .from(tenantGroups)
          .where(eq(tenantGroups.tenantId, tenantId));
        if (total >= GROUP_LIMIT_PER_TENANT) return refuse(new Conflict({ message: GROUP_LIMIT_REACHED }));
        const [row] = await tx.insert(tenantGroups).values({ tenantId, name }).returning();
        await insertAuditEntry(tx, { actorPartyId, action: "group.created", subjectId: row.id, tenantId, after: { name } });
        return toGroup(row, []);
      }),
    catch: classify,
  });

export const renameGroupEffect = (db: PoolDbType, tenantId: string, userId: string, groupId: string, name: string): Effect.Effect<Group, GroupFailure> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorOf(tx, userId);
        const before = await groupOf(tx, tenantId, groupId);
        const [row] = await tx.update(tenantGroups).set({ name }).where(eq(tenantGroups.id, groupId)).returning();
        const members = await tx.select({ partyId: tenantGroupMembers.partyId }).from(tenantGroupMembers).where(eq(tenantGroupMembers.groupId, groupId));
        await insertAuditEntry(tx, { actorPartyId, action: "group.renamed", subjectId: groupId, tenantId, before: { name: before.name }, after: { name } });
        return toGroup(row, members.map((member) => member.partyId));
      }),
    catch: classify,
  });

// -----
// Deleting a Group removes its memberships and
// nothing else: the people stay in the account.
// -----
export const deleteGroupEffect = (db: PoolDbType, tenantId: string, userId: string, groupId: string): Effect.Effect<GroupDeleted, GroupFailure> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorOf(tx, userId);
        const group = await groupOf(tx, tenantId, groupId);
        await tx.delete(tenantGroups).where(eq(tenantGroups.id, groupId));
        await insertAuditEntry(tx, { actorPartyId, action: "group.deleted", subjectId: groupId, tenantId, before: { name: group.name } });
        return { id: groupId };
      }),
    catch: classify,
  });

// -----
// Put a person in a Group. Doing it twice is fine.
// The person must already hold a Role in the
// Tenant: the composite key enforces it too.
// -----
export const addGroupMemberEffect = (
  db: PoolDbType,
  tenantId: string,
  userId: string,
  groupId: string,
  partyId: string,
): Effect.Effect<GroupMember, GroupFailure> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorOf(tx, userId);
        await groupOf(tx, tenantId, groupId);
        const [role] = await tx
          .select({ id: partyRoles.id })
          .from(partyRoles)
          .where(and(eq(partyRoles.tenantId, tenantId), eq(partyRoles.partyId, partyId)));
        if (!role) return refuse(new NotFound({ message: GROUP_PERSON_NOT_FOUND }));
        const [{ total }] = await tx
          .select({ total: sql<number>`count(*)::int` })
          .from(tenantGroupMembers)
          .where(eq(tenantGroupMembers.groupId, groupId));
        if (total >= GROUP_MEMBER_LIMIT) return refuse(new Conflict({ message: GROUP_FULL }));
        const added = await tx
          .insert(tenantGroupMembers)
          .values({ groupId, tenantId, partyId })
          .onConflictDoNothing()
          .returning({ partyId: tenantGroupMembers.partyId });
        if (added.length > 0) {
          await insertAuditEntry(tx, { actorPartyId, action: "group.member.added", subjectId: groupId, tenantId, after: { partyId } });
        }
        return { groupId, partyId };
      }),
    catch: classify,
  });

export const removeGroupMemberEffect = (
  db: PoolDbType,
  tenantId: string,
  userId: string,
  groupId: string,
  partyId: string,
): Effect.Effect<GroupMember, GroupFailure> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorOf(tx, userId);
        await groupOf(tx, tenantId, groupId);
        const removed = await tx
          .delete(tenantGroupMembers)
          .where(and(eq(tenantGroupMembers.groupId, groupId), eq(tenantGroupMembers.partyId, partyId)))
          .returning({ partyId: tenantGroupMembers.partyId });
        if (removed.length === 0) return refuse(new NotFound({ message: GROUP_PERSON_NOT_FOUND }));
        await insertAuditEntry(tx, { actorPartyId, action: "group.member.removed", subjectId: groupId, tenantId, after: { partyId } });
        return { groupId, partyId };
      }),
    catch: classify,
  });
