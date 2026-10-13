import { EventType, type StreamChunk, type StreamDurability } from "@tanstack/ai";
import {
  CHAT_BOT_DURABLE_STREAM_DEFAULT_BATCH,
  CHAT_BOT_DURABLE_STREAM_DEFAULT_ERROR_MESSAGE,
  CHAT_BOT_DURABLE_STREAM_DEFAULT_FLUSH_EVERY_MS,
  CHAT_BOT_DURABLE_STREAM_DELTA_EVENTS,
} from "./constants";
import type { ChatBotDurableRunOptions } from "./types";

function runErrorChunk(runId: string, message: string): StreamChunk {
  return {
    type: EventType.RUN_ERROR,
    runId,
    message,
    error: { message },
    timestamp: new Date().getTime(),
  };
}

// -----
// Writes a run to the stream, for waitUntil:
// it keeps going after the client leaves.
// -----
export async function produceChatBotDurableRun(
  durability: StreamDurability,
  source: AsyncIterable<StreamChunk>,
  options: ChatBotDurableRunOptions,
): Promise<void> {
  const batchSize = options.batch ?? CHAT_BOT_DURABLE_STREAM_DEFAULT_BATCH;
  const flushEveryMs = options.flushEveryMs ?? CHAT_BOT_DURABLE_STREAM_DEFAULT_FLUSH_EVERY_MS;
  const batch: Array<StreamChunk> = [];
  let flushedAt = new Date();
  try {
    for await (const chunk of source) {
      batch.push(chunk);
      // -----
      // Deltas wait for a batch; every other
      // event is flushed right away.
      // -----
      const due =
        batch.length >= batchSize ||
        !CHAT_BOT_DURABLE_STREAM_DELTA_EVENTS.has(chunk.type) ||
        new Date().getTime() - flushedAt.getTime() >= flushEveryMs;
      if (due) {
        await durability.append(batch.splice(0));
        flushedAt = new Date();
      }
    }
    if (batch.length > 0) await durability.append(batch);
    await durability.close();
  } catch (error) {
    // -----
    // End with a fixed RUN_ERROR; the real cause
    // is rethrown, never sent to the client.
    // -----
    const message = options.errorMessage ?? CHAT_BOT_DURABLE_STREAM_DEFAULT_ERROR_MESSAGE;
    batch.push(runErrorChunk(options.runId, message));
    await durability.append(batch).catch(() => undefined);
    // -----
    // A failed close is reported, not thrown,
    // so the run's own error stays the cause.
    // -----
    await durability.close().catch((closeError: unknown) => options.onCloseError?.(closeError));
    throw error;
  }
}
