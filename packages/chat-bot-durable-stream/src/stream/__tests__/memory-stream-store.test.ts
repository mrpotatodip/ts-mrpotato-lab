import { afterEach, describe, expect, it, vi } from "vitest";
import type { StreamChunk } from "@tanstack/ai";
import { memoryChatBotDurableStreamStore } from "../memory-stream-store";

const chunk = {
  type: "CUSTOM" as const,
  name: "run.accepted",
  value: {},
  timestamp: 1,
} satisfies StreamChunk;

const key = (runId: string, streamPrefix = "chat") => ({ streamPrefix, runId });

describe("memoryChatBotDurableStreamStore", () => {
  afterEach(() => vi.useRealTimers());

  it("continues seq across appends", async () => {
    const store = memoryChatBotDurableStreamStore();
    await store.append(key("run-1"), [chunk]);
    expect(await store.append(key("run-1"), [chunk, chunk])).toEqual([2, 3]);
    expect((await store.listAfter(key("run-1"), 1)).map((row) => row.seq)).toEqual([2, 3]);
  });

  it("closes a stream that never got a chunk", async () => {
    const store = memoryChatBotDurableStreamStore();
    expect(await store.isClosed(key("run-1"))).toBe(false);
    await store.close(key("run-1"));
    expect(await store.isClosed(key("run-1"))).toBe(true);
  });

  it("prunes only closed streams of that prefix closed before the cutoff", async () => {
    const store = memoryChatBotDurableStreamStore();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T10:00:00.000Z"));
    await store.append(key("old"), [chunk]);
    await store.close(key("old"));
    await store.append(key("old", "other"), [chunk]);
    await store.close(key("old", "other"));
    vi.setSystemTime(new Date("2026-09-30T10:20:00.000Z"));
    await store.append(key("recent"), [chunk]);
    await store.close(key("recent"));
    await store.append(key("live"), [chunk]);

    await store.prune("chat", new Date("2026-09-30T10:10:00.000Z"));

    expect(await store.listAfter(key("old"), 0)).toEqual([]);
    expect(await store.listAfter(key("old", "other"), 0)).toHaveLength(1);
    expect(await store.listAfter(key("recent"), 0)).toHaveLength(1);
    expect(await store.listAfter(key("live"), 0)).toHaveLength(1);
  });
});
