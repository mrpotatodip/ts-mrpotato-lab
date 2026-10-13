import type { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import type { DbError } from "#/lib/effect-query";
import { listChatBotThreadsForOwnerEffect } from "#/modules/chat-bot/queries";
import type { ChatBotThreadListItem, ChatBotThreadsQuery } from "@repo/contracts/chat-bots";

export const listChatBotThreadsSvc = (
  db: DbConnectType,
  owner: ChatBotOwner,
  query: ChatBotThreadsQuery = {},
): Effect.Effect<ChatBotThreadListItem[], DbError> =>
  listChatBotThreadsForOwnerEffect(db, owner, query);
