import type { ChatBotDurableStreamInit } from "@repo/chat-bot-durable-stream";
import { pgChatBotDurableStream } from "@repo/chat-bot-durable-stream/server";
import type { DbConnectType } from "#/lib/db-connection";
import {
  CHAT_BOT_STREAM_CHUNK_RETAIN_MS,
  CHAT_BOT_STREAM_PREFIX,
} from "#/modules/chat-bot/constants";
import type { ChatBotDurableStreams } from "#/modules/chat-bot/types";

// -----
// The chat-bot's stream settings, shared by
// the route and by tests on a memory store.
// -----
export const chatBotDurableStreamOptions = {
  streamPrefix: CHAT_BOT_STREAM_PREFIX,
  retainMs: CHAT_BOT_STREAM_CHUNK_RETAIN_MS,
  onPruneError: (error) => {
    console.error("chat-bot: failed to prune streams", error);
  },
} satisfies Pick<ChatBotDurableStreamInit, "streamPrefix" | "retainMs" | "onPruneError">;

// -----
// Callers pass a run they already authorised,
// never the raw request, so it can't pick one.
// -----
export function chatBotDurableStreams(db: DbConnectType): ChatBotDurableStreams {
  return (init) => pgChatBotDurableStream(init, { db, ...chatBotDurableStreamOptions });
}
