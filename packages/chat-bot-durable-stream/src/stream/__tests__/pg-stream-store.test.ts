import { describe, expect, it } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { pgChatBotDurableStreamStore } from "../pg-stream-store";
import { pgChatBotDurableStream } from "../pg-durable-stream";
import type { ChatBotDurableStreamDb } from "../types";

type StubChain = () => StubChain;

// -----
// Any Drizzle chain resolves to the next
// queued result, or rejects on an Error.
// -----
function stubDb(...results: Array<object | Error>): ChatBotDurableStreamDb {
  const queue = [...results];
  const chain = (): StubChain =>
    new Proxy<StubChain>(() => chain(), {
      get: (_target, prop) => {
        if (prop !== "then") return chain;
        const next = queue.shift() ?? [];
        const settled = next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
        return settled.then.bind(settled);
      },
    });
  // SAFETY: the store only builds and awaits query chains.
  return chain() as never;
}

const key = { streamPrefix: "chat", runId: "run-1" };

const chunk: StreamChunk = {
  type: EventType.RUN_ERROR,
  runId: "run-1",
  message: "Run failed",
  error: { message: "Run failed" },
  timestamp: 0,
};

describe("pgChatBotDurableStreamStore", () => {
  it("numbers appended chunks after the stream's current max seq", async () => {
    const store = pgChatBotDurableStreamStore(stubDb([], [{ seq: 4 }], []));

    await expect(store.append(key, [chunk, chunk])).resolves.toEqual([5, 6]);
  });

  it("numbers later appends from memory with one insert each", async () => {
    const store = pgChatBotDurableStreamStore(
      stubDb([], [{ seq: 4 }], [], [], new Error("re-read the max seq")),
    );

    await store.append(key, [chunk, chunk]);

    await expect(store.append(key, [chunk])).resolves.toEqual([7]);
  });

  it("re-reads the max seq after a failed insert", async () => {
    const store = pgChatBotDurableStreamStore(
      stubDb([], [{ seq: 4 }], [], new Error("duplicate key"), [], [{ seq: 9 }], []),
    );

    await store.append(key, [chunk]);
    await expect(store.append(key, [chunk])).rejects.toThrow("duplicate key");

    await expect(store.append(key, [chunk])).resolves.toEqual([10]);
  });

  it("skips the database when there is nothing to append", async () => {
    const store = pgChatBotDurableStreamStore(stubDb(new Error("should not be called")));

    await expect(store.append(key, [])).resolves.toEqual([]);
  });

  it("lists the chunks after a seq as stored", async () => {
    const rows = [{ seq: 3, chunk: { type: "RUN_FINISHED", runId: "run-1" } }];

    await expect(pgChatBotDurableStreamStore(stubDb(rows)).listAfter(key, 2)).resolves.toEqual(rows);
  });

  it.each([
    [[{ closedAt: null }], false],
    [[{ closedAt: new Date() }], true],
    [[], false],
  ])("reports a stream with rows %j as closed: %s", async (rows, closed) => {
    await expect(pgChatBotDurableStreamStore(stubDb(rows)).isClosed(key)).resolves.toBe(closed);
  });

  it("rejects with the driver's error when a query fails", async () => {
    const store = pgChatBotDurableStreamStore(stubDb(new Error("connection reset")));

    await expect(store.close(key)).rejects.toThrow("connection reset");
  });

  it("stops waiting as soon as the reader aborts", async () => {
    const store = pgChatBotDurableStreamStore(stubDb(), { pollMs: 60_000 });
    const controller = new AbortController();
    const waiting = store.waitForChange(key, controller.signal);
    controller.abort();
    await expect(waiting).resolves.toBeUndefined();
  });

  it("returns at once when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      pgChatBotDurableStreamStore(stubDb()).waitForChange(key, controller.signal),
    ).resolves.toBeUndefined();
  });
});

describe("pgChatBotDurableStream", () => {
  it("reads the run and offset from the request", () => {
    const durability = pgChatBotDurableStream(
      new Request("https://chat.local/?runId=run-1", {
        headers: { "Last-Event-ID": "pg:v1:run-1:2" },
      }),
      { db: stubDb(), streamPrefix: "chat" },
    );

    expect(durability.resumeFrom()).toBe("pg:v1:run-1:2");
  });

  it("takes a run the server already knows", () => {
    const durability = pgChatBotDurableStream({ runId: "run-1" }, { db: stubDb() });

    expect(durability.resumeFrom()).toBeNull();
  });

  it("refuses a request that names no run", () => {
    expect(() =>
      pgChatBotDurableStream(new Request("https://chat.local/"), { db: stubDb() }),
    ).toThrow("needs a runId");
  });
});
