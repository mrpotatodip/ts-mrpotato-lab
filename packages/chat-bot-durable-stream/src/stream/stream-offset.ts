import {
  CHAT_BOT_DURABLE_STREAM_OFFSET_INVALID,
  CHAT_BOT_DURABLE_STREAM_OFFSET_OTHER_RUN,
  CHAT_BOT_DURABLE_STREAM_OFFSET_PREFIX,
  CHAT_BOT_DURABLE_STREAM_START_OFFSET,
} from "./constants";
import type {
  ChatBotDurableStreamCursor,
  ChatBotDurableStreamOffsetCheck,
  ChatBotDurableStreamOffsetError,
} from "./types";

export function encodeChatBotDurableStreamOffset(runId: string, seq: number): string {
  return `${CHAT_BOT_DURABLE_STREAM_OFFSET_PREFIX}${encodeURIComponent(runId)}:${seq}`;
}

export function decodeChatBotDurableStreamOffset(offset: string): ChatBotDurableStreamCursor | null {
  if (!offset.startsWith(CHAT_BOT_DURABLE_STREAM_OFFSET_PREFIX)) return null;
  const encoded = offset.slice(CHAT_BOT_DURABLE_STREAM_OFFSET_PREFIX.length);
  const separator = encoded.lastIndexOf(":");
  if (separator === -1) return null;
  const seq = Number(encoded.slice(separator + 1));
  if (!Number.isSafeInteger(seq) || seq < 1) return null;
  try {
    return { runId: decodeURIComponent(encoded.slice(0, separator)), seq };
  } catch {
    return null;
  }
}

// -----
// The seq to read after, inside the run the
// caller authorised; "-1" means from the start.
// -----
export function checkChatBotDurableStreamOffset(
  offset: string,
  runId: string,
): ChatBotDurableStreamOffsetCheck {
  if (offset === CHAT_BOT_DURABLE_STREAM_START_OFFSET) return { seq: 0 };
  const cursor = decodeChatBotDurableStreamOffset(offset);
  if (!cursor) return { error: CHAT_BOT_DURABLE_STREAM_OFFSET_INVALID };
  if (cursor.runId !== runId) return { error: CHAT_BOT_DURABLE_STREAM_OFFSET_OTHER_RUN };
  return { seq: cursor.seq };
}

export function isChatBotDurableStreamOffsetError(
  check: ChatBotDurableStreamOffsetCheck,
): check is ChatBotDurableStreamOffsetError {
  return "error" in check;
}

// -----
// Last-Event-ID wins; a join uses ?offset.
// Missing both means a fresh producer.
// -----
export function readChatBotDurableStreamResumeOffset(request: Request): string | null {
  const header = request.headers.get("Last-Event-ID");
  if (header) return header;
  try {
    return new URL(request.url).searchParams.get("offset");
  } catch {
    return null;
  }
}
