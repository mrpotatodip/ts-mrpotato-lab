import { describe, expect, it, vi } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { createChatBotDurableStream } from "../durable-stream";
import { memoryChatBotDurableStreamStore } from "../memory-stream-store";
import { produceChatBotDurableRun } from "../produce-durable-run";

const key = { streamPrefix: "runs", runId: "run-1" };

const delta = (text: string): StreamChunk => ({
  type: EventType.TEXT_MESSAGE_CONTENT,
  messageId: "m1",
  delta: text,
  timestamp: 1,
});

const finished: StreamChunk = {
  type: EventType.RUN_FINISHED,
  runId: "run-1",
  threadId: "thread-1",
  timestamp: 2,
};

async function* stream(...chunks: StreamChunk[]) {
  yield* chunks;
}

async function* failing() {
  yield delta("half");
  throw new Error("model exploded");
}

describe("produceChatBotDurableRun", () => {
  it("writes every chunk, then closes the stream", async () => {
    const store = memoryChatBotDurableStreamStore();
    const durability = createChatBotDurableStream(store, { runId: "run-1" });

    await produceChatBotDurableRun(durability, stream(delta("a"), delta("b"), finished), {
      runId: "run-1",
    });

    const rows = await store.listAfter(key, 0);
    expect(rows.map((row) => row.chunk)).toEqual([delta("a"), delta("b"), finished]);
    expect(await store.isClosed(key)).toBe(true);
  });

  it("holds deltas for a batch and flushes other events at once", async () => {
    const store = memoryChatBotDurableStreamStore();
    const append = vi.spyOn(store, "append");
    const durability = createChatBotDurableStream(store, { runId: "run-1" });

    await produceChatBotDurableRun(durability, stream(delta("a"), delta("b"), finished), {
      runId: "run-1",
      flushEveryMs: 60_000,
    });

    expect(append).toHaveBeenCalledTimes(1);
  });

  it("ends a failed run with a fixed RUN_ERROR, closes it, and rethrows the cause", async () => {
    const store = memoryChatBotDurableStreamStore();
    const durability = createChatBotDurableStream(store, { runId: "run-1" });

    const producing = produceChatBotDurableRun(durability, failing(), {
      runId: "run-1",
      errorMessage: "Chat run failed",
    });

    await expect(producing).rejects.toThrow("model exploded");
    const rows = await store.listAfter(key, 0);
    expect(rows.at(-1)?.chunk).toEqual(
      expect.objectContaining({ type: "RUN_ERROR", runId: "run-1", message: "Chat run failed" }),
    );
    expect(await store.isClosed(key)).toBe(true);
  });

  it("reports a failed close and keeps the run's own error", async () => {
    const store = memoryChatBotDurableStreamStore();
    const closeError = new Error("db down");
    const durability = {
      ...createChatBotDurableStream(store, { runId: "run-1" }),
      close: () => Promise.reject(closeError),
    };
    const onCloseError = vi.fn();

    const producing = produceChatBotDurableRun(durability, failing(), {
      runId: "run-1",
      onCloseError,
    });

    await expect(producing).rejects.toThrow("model exploded");
    expect(onCloseError).toHaveBeenCalledWith(closeError);
  });
});
