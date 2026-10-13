import type { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import type { DbError, NotFound } from "#/lib/effect-query";
import { getChatBotThreadForOwnerEffect } from "#/modules/chat-bot/queries";
import type { ChatBotThreadDetail } from "@repo/contracts/chat-bots";

export const getChatBotThreadSvc = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<ChatBotThreadDetail, DbError | NotFound> =>
  getChatBotThreadForOwnerEffect(db, owner, threadId);
