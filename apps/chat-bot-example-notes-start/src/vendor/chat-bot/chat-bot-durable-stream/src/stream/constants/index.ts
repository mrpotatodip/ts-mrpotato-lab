import { EventType } from "@tanstack/ai";

// -----
// Stream names
// -----
export const CHAT_BOT_DURABLE_STREAM_DEFAULT_PREFIX = "runs";

// -----
// Offsets
// -----
export const CHAT_BOT_DURABLE_STREAM_START_OFFSET = "-1";
export const CHAT_BOT_DURABLE_STREAM_OFFSET_PREFIX = "pg:v1:";
export const CHAT_BOT_DURABLE_STREAM_OFFSET_INVALID = "invalid offset";
export const CHAT_BOT_DURABLE_STREAM_OFFSET_OTHER_RUN = "offset belongs to another run";

// -----
// Retention: closed streams older than
// this are pruned when another closes.
// -----
export const CHAT_BOT_DURABLE_STREAM_DEFAULT_RETAIN_MS = 10 * 60 * 1000;

// -----
// Reading
// -----
export const CHAT_BOT_DURABLE_STREAM_DEFAULT_POLL_MS = 50;

// -----
// Producing
// -----
export const CHAT_BOT_DURABLE_STREAM_DEFAULT_BATCH = 32;
export const CHAT_BOT_DURABLE_STREAM_DEFAULT_FLUSH_EVERY_MS = 100;
export const CHAT_BOT_DURABLE_STREAM_DEFAULT_ERROR_MESSAGE = "Run failed";
export const CHAT_BOT_DURABLE_STREAM_DELTA_EVENTS: ReadonlySet<string> = new Set([
  EventType.TEXT_MESSAGE_CONTENT,
  EventType.TOOL_CALL_ARGS,
  EventType.REASONING_MESSAGE_CONTENT,
]);

// -----
// An open stream whose newest chunk is older
// than this has lost its producer.
// -----
export const CHAT_BOT_DURABLE_STREAM_DEFAULT_STALE_MS = 2 * 60 * 1000;
export const CHAT_BOT_DURABLE_STREAM_STALE_MESSAGE = "The reply stopped before it finished";
