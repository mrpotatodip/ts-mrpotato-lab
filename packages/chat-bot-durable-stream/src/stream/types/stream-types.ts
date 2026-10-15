import type { StreamChunk } from "@tanstack/ai";
import type {
  CHAT_BOT_DURABLE_STREAM_OFFSET_INVALID,
  CHAT_BOT_DURABLE_STREAM_OFFSET_OTHER_RUN,
} from "../constants";

// -----
// Store
// -----
export type ChatBotDurableStreamKey = { streamPrefix: string; runId: string };

export type ChatBotDurableStreamRow = { seq: number; chunk: StreamChunk };

export type ChatBotDurableStreamStore = {
  append: (key: ChatBotDurableStreamKey, chunks: Array<StreamChunk>) => Promise<Array<number>>;
  listAfter: (
    key: ChatBotDurableStreamKey,
    afterSeq: number,
  ) => Promise<Array<ChatBotDurableStreamRow>>;
  isClosed: (key: ChatBotDurableStreamKey) => Promise<boolean>;
  close: (key: ChatBotDurableStreamKey) => Promise<void>;
  prune: (streamPrefix: string, closedBefore: Date) => Promise<void>;
  waitForChange: (key: ChatBotDurableStreamKey, signal?: AbortSignal) => Promise<void>;
};

export type ChatBotDurableStreamStoreOptions = { pollMs?: number };

// -----
// Adapter
// -----
export type ChatBotDurableStreamInit = {
  runId: string;
  offset?: string | null;
  streamPrefix?: string;
  retainMs?: number | null;
  staleMs?: number | null;
  onPruneError?: (error: unknown) => void;
};

// -----
// Offsets
// -----
export type ChatBotDurableStreamCursor = { runId: string; seq: number };

export type ChatBotDurableStreamOffsetError = {
  error:
    | typeof CHAT_BOT_DURABLE_STREAM_OFFSET_INVALID
    | typeof CHAT_BOT_DURABLE_STREAM_OFFSET_OTHER_RUN;
};

export type ChatBotDurableStreamOffsetCheck = { seq: number } | ChatBotDurableStreamOffsetError;

// -----
// Producer
// -----
export type ChatBotDurableRunOptions = {
  runId: string;
  batch?: number;
  flushEveryMs?: number;
  errorMessage?: string;
  onCloseError?: (error: unknown) => void;
};
