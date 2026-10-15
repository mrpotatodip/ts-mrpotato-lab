import { EventType, type StreamChunk, type StreamDurability } from "@tanstack/ai";
import {
  CHAT_BOT_DURABLE_STREAM_DEFAULT_PREFIX,
  CHAT_BOT_DURABLE_STREAM_DEFAULT_RETAIN_MS,
  CHAT_BOT_DURABLE_STREAM_DEFAULT_STALE_MS,
  CHAT_BOT_DURABLE_STREAM_STALE_MESSAGE,
} from "./constants";
import {
  checkChatBotDurableStreamOffset,
  encodeChatBotDurableStreamOffset,
  isChatBotDurableStreamOffsetError,
} from "./stream-offset";
import type { ChatBotDurableStreamInit, ChatBotDurableStreamStore } from "./types";

// -----
// Ends a stream whose producer died, under
// the model's run id so the client settles.
// -----
function staleRunErrorChunk(runId: string | undefined): StreamChunk {
  const message = CHAT_BOT_DURABLE_STREAM_STALE_MESSAGE;
  const chunk: StreamChunk = {
    type: EventType.RUN_ERROR,
    message,
    error: { message },
    timestamp: new Date().getTime(),
  };
  return runId ? { ...chunk, runId } : chunk;
}

// -----
// runId is the run the caller authorised. The
// client's offset only says where to start in it.
// -----
export function createChatBotDurableStream(
  store: ChatBotDurableStreamStore,
  init: ChatBotDurableStreamInit,
): StreamDurability {
  const { runId } = init;
  const key = { streamPrefix: init.streamPrefix ?? CHAT_BOT_DURABLE_STREAM_DEFAULT_PREFIX, runId };
  const resumeOffset = init.offset ?? null;
  const retainMs =
    init.retainMs === undefined ? CHAT_BOT_DURABLE_STREAM_DEFAULT_RETAIN_MS : init.retainMs;
  const staleMs =
    init.staleMs === undefined ? CHAT_BOT_DURABLE_STREAM_DEFAULT_STALE_MS : init.staleMs;
  const toEntry = (row: { seq: number; chunk: StreamChunk }) => ({
    offset: encodeChatBotDurableStreamOffset(runId, row.seq),
    chunk: row.chunk,
  });

  return {
    resumeFrom: () => resumeOffset,
    async append(chunks: Array<StreamChunk>) {
      const seqs = await store.append(key, chunks);
      return seqs.map((seq) => encodeChatBotDurableStreamOffset(runId, seq));
    },
    async *read(offset: string, signal?: AbortSignal) {
      // -----
      // Callers check offsets up front, so a bad
      // one here is a bug, not user input.
      // -----
      const check = checkChatBotDurableStreamOffset(offset, runId);
      if (isChatBotDurableStreamOffsetError(check)) {
        throw new Error(`Durable stream ${runId}: ${check.error}`);
      }
      let seq = check.seq;
      let modelRunId: string | undefined;
      // -----
      // Newest chunk's time, or the read's start
      // when the run has written nothing yet.
      // -----
      let lastActivity = new Date().getTime();
      while (true) {
        if (signal?.aborted) return;
        // -----
        // One round trip; seeing closed, list again
        // so a batch written before the close drains.
        // -----
        const [closed, rows] = await Promise.all([
          store.isClosed(key),
          store.listAfter(key, seq),
        ]);
        const rest = closed ? await store.listAfter(key, rows.at(-1)?.seq ?? seq) : [];
        for (const row of [...rows, ...rest]) {
          yield toEntry(row);
          seq = row.seq;
          if (row.chunk.type === EventType.RUN_STARTED) modelRunId = row.chunk.runId;
          lastActivity = row.chunk.timestamp ?? new Date().getTime();
        }
        if (closed) return;
        if (staleMs !== null && new Date().getTime() - lastActivity > staleMs) {
          yield {
            offset: encodeChatBotDurableStreamOffset(runId, seq),
            chunk: staleRunErrorChunk(modelRunId),
          };
          return;
        }
        await store.waitForChange(key, signal);
      }
    },
    async close() {
      await store.close(key);
      if (retainMs === null) return;
      // -----
      // Sweep old streams of this prefix. A failed
      // sweep is reported; the next close retries.
      // -----
      const cutoff = new Date(new Date().getTime() - retainMs);
      await store.prune(key.streamPrefix, cutoff).catch((error: unknown) => {
        init.onPruneError?.(error);
      });
    },
    async snapshot() {
      const rows = await store.listAfter(key, 0);
      return rows.map(toEntry);
    },
  };
}
