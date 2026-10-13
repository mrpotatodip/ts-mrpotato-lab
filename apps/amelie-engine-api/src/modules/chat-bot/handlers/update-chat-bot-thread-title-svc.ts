import type { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import type { DbError, NotFound } from "#/lib/effect-query";
import { updateChatBotThreadTitleForOwnerEffect } from "#/modules/chat-bot/queries";
import type { ChatBotThreadListItem } from "@repo/contracts/chat-bots";

export const updateChatBotThreadTitleSvc = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
  title: string,
): Effect.Effect<ChatBotThreadListItem, DbError | NotFound> =>
  updateChatBotThreadTitleForOwnerEffect(db, owner, threadId, title);
