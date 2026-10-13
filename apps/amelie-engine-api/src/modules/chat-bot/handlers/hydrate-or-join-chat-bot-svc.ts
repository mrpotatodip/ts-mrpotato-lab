import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, type DbError, type NotFound } from "#/lib/effect-query";
import { CHAT_BOT_THREAD_ID_REQUIRED } from "#/modules/chat-bot/constants";
import type { ChatBotDurableStreams, ChatBotOwner } from "#/modules/chat-bot/types";
import { hydrateChatBotSvc } from "./hydrate-chat-bot-svc";
import { isChatBotStreamResume, joinChatBotSseSvc } from "./resume-chat-bot-sse-svc";

// -----
// An offset rejoins a live run's SSE.
// Otherwise it is TanStack AI's hydrate.
// -----
export const hydrateOrJoinChatBotSvc = (
  db: DbConnectType,
  durableStream: ChatBotDurableStreams,
  owner: ChatBotOwner,
  threadId: string | undefined,
  request: Request,
): Effect.Effect<Response, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    if (isChatBotStreamResume(request)) {
      return yield* joinChatBotSseSvc(db, durableStream, owner, request);
    }
    if (!threadId) return yield* new Invalid({ message: CHAT_BOT_THREAD_ID_REQUIRED });
    // -----
    // Bare { messages, activeRun }, not the
    // envelope: the client library parses it.
    // -----
    const hydrate = yield* hydrateChatBotSvc(db, owner, threadId);
    return Response.json(hydrate);
  });
