import { Effect } from "effect";
import { readChatBotDurableStreamResumeOffset } from "@repo/chat-bot-durable-stream";
import { resolveResumeRunId, resumeServerSentEventsResponse } from "@tanstack/ai";
import { CHAT_BOT_THREAD_ID_HEADER } from "@repo/contracts/chat-bots";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, type DbError, type NotFound } from "#/lib/effect-query";
import { CHAT_BOT_STREAM_RUN_ID_REQUIRED } from "#/modules/chat-bot/constants";
import { findChatBotRunForOwnerEffect } from "#/modules/chat-bot/queries";
import { readChatBotStreamOffsetForRunEffect } from "#/modules/chat-bot/lib";
import type { ChatBotDurableStreams, ChatBotOwner } from "#/modules/chat-bot/types";

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
// The run must be the caller's; the offset
// must point into that same run.
// -----
export const joinChatBotSseSvc = (
  db: DbConnectType,
  durableStream: ChatBotDurableStreams,
  owner: ChatBotOwner,
  request: Request,
): Effect.Effect<Response, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    const runId = resolveResumeRunId(request);
    if (!runId) return yield* new Invalid({ message: CHAT_BOT_STREAM_RUN_ID_REQUIRED });
    const run = yield* findChatBotRunForOwnerEffect(db, owner, runId);
    const offset = yield* readChatBotStreamOffsetForRunEffect(request, run.id);
    return resumeChatBotSseResponse(durableStream, run.id, offset, run.threadId);
  });
