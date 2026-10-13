import type { Effect } from "effect";
import type { ChatBotThreadDeleted } from "@repo/contracts/chat-bots";
import type { DbConnectType } from "#/lib/db-connection";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import type { DbError, NotFound } from "#/lib/effect-query";
import { deleteChatBotThreadForOwnerEffect } from "#/modules/chat-bot/queries";

export const deleteChatBotThreadSvc = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<ChatBotThreadDeleted, DbError | NotFound> =>
  deleteChatBotThreadForOwnerEffect(db, owner, threadId);
