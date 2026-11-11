import type { Effect } from "effect";
import type { Group, GroupDeleted, GroupList, GroupMember } from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import {
  addGroupMemberEffect,
  createGroupEffect,
  deleteGroupEffect,
  listGroupsEffect,
  removeGroupMemberEffect,
  renameGroupEffect,
} from "#/modules/groups/queries";
import type { GroupFailure } from "#/modules/groups/types";

export const listGroupsSvc = (db: DbConnectType, accountId: string): Effect.Effect<GroupList, DbError> => listGroupsEffect(db, accountId);

export const createGroupSvc = (db: PoolDbType, accountId: string, userId: string, name: string): Effect.Effect<Group, GroupFailure> =>
  createGroupEffect(db, accountId, userId, name);

export const renameGroupSvc = (db: PoolDbType, accountId: string, userId: string, groupId: string, name: string): Effect.Effect<Group, GroupFailure> =>
  renameGroupEffect(db, accountId, userId, groupId, name);

export const deleteGroupSvc = (db: PoolDbType, accountId: string, userId: string, groupId: string): Effect.Effect<GroupDeleted, GroupFailure> =>
  deleteGroupEffect(db, accountId, userId, groupId);

export const addGroupMemberSvc = (
  db: PoolDbType,
  accountId: string,
  userId: string,
  groupId: string,
  partyId: string,
): Effect.Effect<GroupMember, GroupFailure> => addGroupMemberEffect(db, accountId, userId, groupId, partyId);

export const removeGroupMemberSvc = (
  db: PoolDbType,
  accountId: string,
  userId: string,
  groupId: string,
  partyId: string,
): Effect.Effect<GroupMember, GroupFailure> => removeGroupMemberEffect(db, accountId, userId, groupId, partyId);
