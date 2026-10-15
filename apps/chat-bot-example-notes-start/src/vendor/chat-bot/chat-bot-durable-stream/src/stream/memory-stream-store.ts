import type { StreamChunk } from "@tanstack/ai";
import type {
  ChatBotDurableStreamKey,
  ChatBotDurableStreamRow,
  ChatBotDurableStreamStore,
} from "./types";

const toId = (key: ChatBotDurableStreamKey) => `${key.streamPrefix}\u0000${key.runId}`;

// -----
// In-memory store for tests and local runs.
// Waiters wake on every append and close.
// -----
export function memoryChatBotDurableStreamStore(): ChatBotDurableStreamStore {
  const streams = new Map<
    string,
    { streamPrefix: string; rows: Array<ChatBotDurableStreamRow>; closedAt: Date | null }
  >();
  const waiters: Array<() => void> = [];
  const wake = () => {
    for (const notify of waiters.splice(0)) notify();
  };
  const streamFor = (key: ChatBotDurableStreamKey) => {
    const id = toId(key);
    const existing = streams.get(id);
    if (existing) return existing;
    const created = { streamPrefix: key.streamPrefix, rows: [], closedAt: null };
    streams.set(id, created);
    return created;
  };

  return {
    async append(key, chunks: Array<StreamChunk>) {
      if (chunks.length === 0) return [];
      const stream = streamFor(key);
      const last = stream.rows.at(-1)?.seq ?? 0;
      const added = chunks.map((chunk, index) => ({ seq: last + index + 1, chunk }));
      stream.rows.push(...added);
      wake();
      return added.map((row) => row.seq);
    },
    async listAfter(key, afterSeq) {
      return (streams.get(toId(key))?.rows ?? []).filter((row) => row.seq > afterSeq);
    },
    async isClosed(key) {
      return streams.get(toId(key))?.closedAt != null;
    },
    async close(key) {
      const stream = streamFor(key);
      stream.closedAt ??= new Date();
      wake();
    },
    async prune(streamPrefix, closedBefore) {
      for (const [id, stream] of streams) {
        if (stream.streamPrefix !== streamPrefix) continue;
        if (stream.closedAt && stream.closedAt < closedBefore) streams.delete(id);
      }
    },
    async waitForChange(key, signal) {
      if (signal?.aborted) return;
      await new Promise<void>((resolve) => {
        const notify = () => {
          signal?.removeEventListener("abort", notify);
          resolve();
        };
        waiters.push(notify);
        signal?.addEventListener("abort", notify, { once: true });
        if (streams.get(toId(key))?.closedAt) notify();
      });
    },
  };
}
