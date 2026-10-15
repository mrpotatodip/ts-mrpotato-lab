import { Effect } from "effect";
import { readChatBotDurableStreamResumeOffset } from "@repo/chat-bot-durable-stream";
import { resolveResumeRunId, resumeServerSentEventsResponse } from "@tanstack/ai";
import { CHAT_BOT_THREAD_ID_HEADER } from "../contracts";
import { CHAT_BOT_RUN_NOT_FOUND, CHAT_BOT_STREAM_RUN_ID_REQUIRED } from "../constants";
import { ChatBotDbError, ChatBotInvalid, ChatBotNotFound } from "../errors";
import { readChatBotStreamOffsetForRunEffect } from "../lib/stream-offset";
import type { ChatBotDurableStreams, ChatBotOwner, ChatBotRunRef, ChatBotStore } from "../types";

export function resumeChatBotSseResponse(
  durableStream: ChatBotDurableStreams,
  runId: string,
  offset: string,
  threadId: string,
): Response {
  const response = resumeServerSentEventsResponse({
    adapter: durableStream({ runId, offset }),
  });
  response.headers.set(CHAT_BOT_THREAD_ID_HEADER, threadId);
  return response;
}

export function isChatBotStreamResume(request: Request): boolean {
  return readChatBotDurableStreamResumeOffset(request) !== null;
}

// -----
// A run the owner holds, or NotFound: a
// stranger's run looks the same as a missing one.
// -----
export const findChatBotRunForOwnerSvc = (
  store: ChatBotStore,
  owner: ChatBotOwner,
  runId: string,
): Effect.Effect<ChatBotRunRef, ChatBotDbError | ChatBotNotFound> =>
  Effect.gen(function* () {
    const run = yield* store.lookupRun(owner, runId);
    if (!run) return yield* new ChatBotNotFound({ message: CHAT_BOT_RUN_NOT_FOUND });
    return run;
  });

// -----
// The run must be the caller's; the offset
// must point into that same run.
// -----
export const joinChatBotSseSvc = (
  store: ChatBotStore,
  durableStream: ChatBotDurableStreams,
  owner: ChatBotOwner,
  request: Request,
): Effect.Effect<Response, ChatBotDbError | ChatBotNotFound | ChatBotInvalid> =>
  Effect.gen(function* () {
    const runId = resolveResumeRunId(request);
    if (!runId) return yield* new ChatBotInvalid({ message: CHAT_BOT_STREAM_RUN_ID_REQUIRED });
    const run = yield* findChatBotRunForOwnerSvc(store, owner, runId);
    const offset = yield* readChatBotStreamOffsetForRunEffect(request, run.id);
    return resumeChatBotSseResponse(durableStream, run.id, offset, run.threadId);
  });
