import { afterEach, describe, expect, it, vi } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { createChatBotDurableStream } from "../durable-stream";
import { memoryChatBotDurableStreamStore } from "../memory-stream-store";
import { CHAT_BOT_DURABLE_STREAM_STALE_MESSAGE } from "../constants";
import { encodeChatBotDurableStreamOffset } from "../stream-offset";
import type { ChatBotDurableStreamInit } from "../types";

const started = {
  type: "CUSTOM" as const,
  name: "run.accepted",
  value: {},
  timestamp: 1,
} satisfies StreamChunk;

async function readAll(iterable: AsyncIterable<{ chunk: StreamChunk }>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const entry of iterable) chunks.push(entry.chunk);
  return chunks;
}

describe("createChatBotDurableStream", () => {
  it("appends chunks and snapshots them with opaque offsets", async () => {
    const durability = createChatBotDurableStream(memoryChatBotDurableStreamStore(), {
      runId: "run-1",
    });
    const offsets = await durability.append([started]);
    expect(offsets).toEqual([encodeChatBotDurableStreamOffset("run-1", 1)]);
    expect(await durability.snapshot()).toEqual([
      { offset: encodeChatBotDurableStreamOffset("run-1", 1), chunk: started },
    ]);
  });

  it("returns the request's offset from resumeFrom, or null for a producer", () => {
    const store = memoryChatBotDurableStreamStore();
    expect(createChatBotDurableStream(store, { runId: "run-1" }).resumeFrom()).toBeNull();
    expect(
      createChatBotDurableStream(store, { runId: "run-1", offset: "pg:v1:run-1:2" }).resumeFrom(),
    ).toBe("pg:v1:run-1:2");
  });

  it("replays from offset=-1 until the producer closes", async () => {
    const store = memoryChatBotDurableStreamStore();
    const producer = createChatBotDurableStream(store, { runId: "run-1" });
    const consumer = createChatBotDurableStream(store, { runId: "run-1", offset: "-1" });

    const reading = readAll(consumer.read("-1"));
    await producer.append([started]);
    await producer.close();

    expect(await reading).toEqual([started]);
  });

  it("resumes strictly after the given offset", async () => {
    const store = memoryChatBotDurableStreamStore();
    const producer = createChatBotDurableStream(store, { runId: "run-1" });
    const second = { ...started, timestamp: 2 };
    await producer.append([started, second]);
    await producer.close();

    const replayed = await readAll(producer.read(encodeChatBotDurableStreamOffset("run-1", 1)));

    expect(replayed).toEqual([second]);
  });

  it("keeps runs with the same id apart across stream prefixes", async () => {
    const store = memoryChatBotDurableStreamStore();
    const chat = createChatBotDurableStream(store, { runId: "run-1", streamPrefix: "chat" });
    const other = createChatBotDurableStream(store, { runId: "run-1", streamPrefix: "other" });
    await chat.append([started]);

    expect(await other.snapshot()).toEqual([]);
  });

  it("refuses to read from an offset into another run", async () => {
    const consumer = createChatBotDurableStream(memoryChatBotDurableStreamStore(), {
      runId: "run-1",
    });

    const reading = consumer.read(encodeChatBotDurableStreamOffset("victim-run", 1));

    await expect(reading[Symbol.asyncIterator]().next()).rejects.toThrow(
      "offset belongs to another run",
    );
  });

  describe("pruning on close", () => {
    afterEach(() => vi.useRealTimers());

    // -----
    // old closes at 10:00; closing run-1 at
    // 10:11 is past the 10-minute default.
    // -----
    async function closeOldThenRun(init: Partial<ChatBotDurableStreamInit> = {}) {
      const store = memoryChatBotDurableStreamStore();
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-09-30T10:00:00.000Z"));
      const old = createChatBotDurableStream(store, { runId: "old", retainMs: null });
      await old.append([started]);
      await old.close();
      vi.setSystemTime(new Date("2026-09-30T10:11:00.000Z"));
      const run = createChatBotDurableStream(store, { runId: "run-1", ...init });
      await run.append([started]);
      await run.close();
      return { old, run, store };
    }

    it("prunes streams of its prefix closed before the retention window", async () => {
      const { old, run } = await closeOldThenRun();

      expect(await old.snapshot()).toEqual([]);
      expect(await run.snapshot()).toHaveLength(1);
    });

    it("keeps everything when retainMs is null", async () => {
      const { old } = await closeOldThenRun({ retainMs: null });

      expect(await old.snapshot()).toHaveLength(1);
    });

    it("reports a failed prune and still closes", async () => {
      const store = memoryChatBotDurableStreamStore();
      const pruneError = new Error("db down");
      const onPruneError = vi.fn();
      const durability = createChatBotDurableStream(
        { ...store, prune: () => Promise.reject(pruneError) },
        { runId: "run-1", onPruneError },
      );

      await expect(durability.close()).resolves.toBeUndefined();
      expect(onPruneError).toHaveBeenCalledWith(pruneError);
      expect(await store.isClosed({ streamPrefix: "runs", runId: "run-1" })).toBe(true);
    });
  });

  it("drains a batch written just before the close it sees", async () => {
    const store = memoryChatBotDurableStreamStore();
    let listed = (): void => undefined;
    const firstList = new Promise<void>((resolve) => {
      listed = resolve;
    });
    let first = true;
    // -----
    // The producer appends and closes between
    // this poll's list and its closed check.
    // -----
    const racing = {
      ...store,
      async listAfter(key: Parameters<typeof store.listAfter>[0], afterSeq: number) {
        const rows = await store.listAfter(key, afterSeq);
        if (first) {
          first = false;
          await store.append(key, [started]);
          await store.close(key);
          listed();
        }
        return rows;
      },
      async isClosed(key: Parameters<typeof store.isClosed>[0]) {
        await firstList;
        return store.isClosed(key);
      },
    };
    const consumer = createChatBotDurableStream(racing, { runId: "run-1" });

    expect(await readAll(consumer.read("-1"))).toEqual([started]);
  });

  describe("a run whose producer died", () => {
    const minutesAgo = (minutes: number) => new Date().getTime() - minutes * 60 * 1000;
    const runStarted = (timestamp: number): StreamChunk => ({
      type: EventType.RUN_STARTED,
      runId: "model-run",
      threadId: "thread-1",
      timestamp,
    });

    it("ends an open stream whose last chunk is too old with a RUN_ERROR", async () => {
      const store = memoryChatBotDurableStreamStore();
      const old = runStarted(minutesAgo(10));
      await createChatBotDurableStream(store, { runId: "run-1" }).append([old]);
      const consumer = createChatBotDurableStream(store, { runId: "run-1", staleMs: 60_000 });

      const entries = [];
      for await (const entry of consumer.read("-1")) entries.push(entry);

      expect(entries.map((entry) => entry.chunk)).toEqual([
        old,
        expect.objectContaining({
          type: "RUN_ERROR",
          runId: "model-run",
          message: CHAT_BOT_DURABLE_STREAM_STALE_MESSAGE,
        }),
      ]);
      expect(entries[1]?.offset).toBe(entries[0]?.offset);
    });

    it("keeps waiting on an open stream with a fresh chunk", async () => {
      const store = memoryChatBotDurableStreamStore();
      const fresh = runStarted(new Date().getTime());
      await createChatBotDurableStream(store, { runId: "run-1" }).append([fresh]);
      const consumer = createChatBotDurableStream(store, { runId: "run-1", staleMs: 60_000 });
      const controller = new AbortController();

      const reading = readAll(consumer.read("-1", controller.signal));
      await new Promise((resolve) => setTimeout(resolve, 20));
      controller.abort();

      expect(await reading).toEqual([fresh]);
    });

    it("never ends a stream early when staleMs is null", async () => {
      const store = memoryChatBotDurableStreamStore();
      const old = runStarted(minutesAgo(10));
      await createChatBotDurableStream(store, { runId: "run-1" }).append([old]);
      const consumer = createChatBotDurableStream(store, { runId: "run-1", staleMs: null });
      const controller = new AbortController();

      const reading = readAll(consumer.read("-1", controller.signal));
      await new Promise((resolve) => setTimeout(resolve, 20));
      controller.abort();

      expect(await reading).toEqual([old]);
    });
  });

  it("stops reading an open stream when the reader aborts", async () => {
    const consumer = createChatBotDurableStream(memoryChatBotDurableStreamStore(), {
      runId: "run-1",
    });
    const controller = new AbortController();

    const reading = readAll(consumer.read("-1", controller.signal));
    controller.abort();

    expect(await reading).toEqual([]);
  });
});
