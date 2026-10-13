import { and, asc, eq, gt, isNotNull, isNull, lt, max } from "drizzle-orm";
import type { StreamChunk } from "@tanstack/ai";
import { chatBotDurableStreamChunks, chatBotDurableStreams } from "../tables";
import { CHAT_BOT_DURABLE_STREAM_DEFAULT_POLL_MS } from "./constants";
import type {
  ChatBotDurableStreamDb,
  ChatBotDurableStreamKey,
  ChatBotDurableStreamStore,
  ChatBotDurableStreamStoreOptions,
} from "./types";

const streamWhere = (key: ChatBotDurableStreamKey) =>
  and(
    eq(chatBotDurableStreams.streamPrefix, key.streamPrefix),
    eq(chatBotDurableStreams.runId, key.runId),
  );

const chunksWhere = (key: ChatBotDurableStreamKey) =>
  and(
    eq(chatBotDurableStreamChunks.streamPrefix, key.streamPrefix),
    eq(chatBotDurableStreamChunks.runId, key.runId),
  );

// -----
// Postgres store. Readers poll every pollMs;
// Postgres can't push to a Worker.
// -----
export function pgChatBotDurableStreamStore(
  db: ChatBotDurableStreamDb,
  options: ChatBotDurableStreamStoreOptions = {},
): ChatBotDurableStreamStore {
  const pollMs = options.pollMs ?? CHAT_BOT_DURABLE_STREAM_DEFAULT_POLL_MS;
  const nextSeqs = new Map<string, number>();

  async function readNextSeq(key: ChatBotDurableStreamKey): Promise<number> {
    await db.insert(chatBotDurableStreams).values(key).onConflictDoNothing();
    const [current] = await db
      .select({ seq: max(chatBotDurableStreamChunks.seq) })
      .from(chatBotDurableStreamChunks)
      .where(chunksWhere(key));
    return (current?.seq ?? 0) + 1;
  }

  return {
    // -----
    // One producer per run, so max(seq)+1 is safe;
    // a second writer hits the primary key.
    // Later appends count on from memory: one
    // round trip per batch, not three.
    // -----
    async append(key, chunks: Array<StreamChunk>) {
      if (chunks.length === 0) return [];
      const id = `${key.streamPrefix}:${key.runId}`;
      const first = nextSeqs.get(id) ?? (await readNextSeq(key));
      const values = chunks.map((chunk, index) => ({ ...key, seq: first + index, chunk }));
      // -----
      // A failed insert forgets the count, so
      // the next append re-reads the max.
      // -----
      nextSeqs.delete(id);
      await db.insert(chatBotDurableStreamChunks).values(values);
      nextSeqs.set(id, first + values.length);
      return values.map((row) => row.seq);
    },
    async listAfter(key, afterSeq) {
      const rows = await db
        .select({ seq: chatBotDurableStreamChunks.seq, chunk: chatBotDurableStreamChunks.chunk })
        .from(chatBotDurableStreamChunks)
        .where(and(chunksWhere(key), gt(chatBotDurableStreamChunks.seq, afterSeq)))
        .orderBy(asc(chatBotDurableStreamChunks.seq));
      // -----
      // SAFETY: append is the only writer, and it
      // stores StreamChunk JSON in this column.
      // -----
      return rows.map((row) => ({ seq: row.seq, chunk: row.chunk as StreamChunk }));
    },
    async isClosed(key) {
      const rows = await db
        .select({ closedAt: chatBotDurableStreams.closedAt })
        .from(chatBotDurableStreams)
        .where(streamWhere(key))
        .limit(1);
      return rows[0]?.closedAt != null;
    },
    // -----
    // Upsert, so a run that failed before its
    // first chunk still ends closed.
    // -----
    async close(key) {
      await db
        .insert(chatBotDurableStreams)
        .values({ ...key, closedAt: new Date() })
        .onConflictDoUpdate({
          target: [chatBotDurableStreams.streamPrefix, chatBotDurableStreams.runId],
          set: { closedAt: new Date() },
          setWhere: isNull(chatBotDurableStreams.closedAt),
        });
    },
    async prune(streamPrefix, closedBefore) {
      await db
        .delete(chatBotDurableStreams)
        .where(
          and(
            eq(chatBotDurableStreams.streamPrefix, streamPrefix),
            isNotNull(chatBotDurableStreams.closedAt),
            lt(chatBotDurableStreams.closedAt, closedBefore),
          ),
        );
    },
    async waitForChange(_key, signal) {
      if (signal?.aborted) return;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, pollMs);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
    },
  };
}
