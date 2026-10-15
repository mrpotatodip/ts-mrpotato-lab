import { Effect } from "effect";
import { CHAT_BOT_THREAD_ID_REQUIRED } from "../constants";
import { ChatBotDbError, ChatBotInvalid, ChatBotNotFound } from "../errors";
import { toChatBotUiMessages } from "../lib/ui-messages";
import type {
  ChatBotDurableStreams,
  ChatBotHydrateResult,
  ChatBotOwner,
  ChatBotStore,
} from "../types";
import { isChatBotStreamResume, joinChatBotSseSvc } from "./resume";

// -----
// Ownership first: the active-run read has
// no owner guard, so it waits for the thread.
// -----
export const hydrateChatBotSvc = (
  store: ChatBotStore,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<ChatBotHydrateResult, ChatBotDbError | ChatBotNotFound> =>
  Effect.gen(function* () {
    const detail = yield* store.getThread(owner, threadId);
    const active = yield* store.findActiveRun(threadId);
    return {
      messages: toChatBotUiMessages(detail.messages),
      activeRun: active ? { runId: active.id } : null,
    };
  });

// -----
// An offset rejoins a live run's SSE.
// Otherwise it is TanStack AI's hydrate.
// -----
export const hydrateOrJoinChatBotSvc = (
  store: ChatBotStore,
  durableStream: ChatBotDurableStreams,
  owner: ChatBotOwner,
  threadId: string | undefined,
  request: Request,
): Effect.Effect<Response, ChatBotDbError | ChatBotNotFound | ChatBotInvalid> =>
  Effect.gen(function* () {
    if (isChatBotStreamResume(request)) {
      return yield* joinChatBotSseSvc(store, durableStream, owner, request);
    }
    if (!threadId) return yield* new ChatBotInvalid({ message: CHAT_BOT_THREAD_ID_REQUIRED });
    // -----
    // Bare { messages, activeRun }, not the
    // envelope: the client library parses it.
    // -----
    const hydrate = yield* hydrateChatBotSvc(store, owner, threadId);
    return Response.json(hydrate);
  });
