import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import {
  findActiveChatBotRunEffect,
  getChatBotThreadForOwnerEffect,
} from "#/modules/chat-bot/queries";
import { toChatBotUiMessages } from "#/modules/chat-bot/lib";
import type { ChatBotHydrateResult, ChatBotOwner } from "#/modules/chat-bot/types";

// -----
// Ownership first: the active-run read has
// no user guard, so it waits for the thread.
// -----
export const hydrateChatBotSvc = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<ChatBotHydrateResult, DbError | NotFound> =>
  Effect.gen(function* () {
    const detail = yield* getChatBotThreadForOwnerEffect(db, owner, threadId);
    const active = yield* findActiveChatBotRunEffect(db, threadId);
    return {
      messages: toChatBotUiMessages(detail.messages),
      activeRun: active ? { runId: active.id } : null,
    };
  });
