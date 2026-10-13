import { Effect } from "effect";
import type { CreateInviteCodeBody, CreatedInviteCode } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { generateInviteCode, hashInviteCode } from "#/modules/invite-code/lib";
import {
  findPartyIdByUserIdEffect,
  getInviteCodeEffect,
  insertInviteCodeEffect,
} from "#/modules/invite-code/queries";

// -----
// The plain code exists only in this function and
// in the answer: the database gets its hash.
// -----
export const createInviteCodeSvc = (
  db: DbConnectType,
  userId: string,
  body: CreateInviteCodeBody,
): Effect.Effect<CreatedInviteCode, DbError | NotFound> =>
  Effect.gen(function* () {
    const createdBy = yield* findPartyIdByUserIdEffect(db, userId);
    const code = generateInviteCode();
    const codeHash = yield* Effect.promise(() => hashInviteCode(code));
    const id = yield* insertInviteCodeEffect(db, {
      note: body.note,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      codeHash,
      createdBy,
    });
    const inviteCode = yield* getInviteCodeEffect(db, id);
    return { code, inviteCode };
  });
