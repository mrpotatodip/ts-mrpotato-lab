import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";
import type { ChatBotThreadDetail } from "../contracts";
import {
  ChatBotInvalid,
  ChatBotNotFound,
  hydrateChatBotSvc,
  hydrateOrJoinChatBotSvc,
  type ChatBotDurableStreams,
  type ChatBotOwner,
  type ChatBotStore,
} from "../index";

const owner: ChatBotOwner = { kind: "user", scopeId: "scope-1", userId: "user-1" };
const threadId = "11111111-1111-4111-8111-111111111111";

const detail = (messages: ChatBotThreadDetail["messages"]): ChatBotThreadDetail => ({
  id: threadId,
  title: "How many?",
  trigger: "chat",
  module: "chat",
  messages,
});

const storeWith = (stubs: Partial<ChatBotStore>): ChatBotStore =>
  // SAFETY: each test reaches only the methods it stubs.
  stubs as ChatBotStore;

const memoryStreams =
  (log = memoryChatBotDurableStreamStore()): ChatBotDurableStreams =>
  (init) =>
    createChatBotDurableStream(log, { ...init, streamPrefix: "chat-bot" });

describe("hydrateChatBotSvc", () => {
  it("returns stored turns and the live run id when one is still running", async () => {
    const store = storeWith({
      getThread: () =>
        Effect.succeed(
          detail([
            {
              id: "m1",
              role: "user",
              content: "How many?",
              toolsUsed: [],
              structure: null,
              createdAt: "2026-09-04T00:00:00.000Z",
            },
            {
              id: "m2",
              role: "assistant",
              content: "That comes to **5**.",
              toolsUsed: ["addTwoNumbers"],
              structure: {
                addTwoNumbers: { display: null, displayOptions: null, results: [{ sum: 5 }] },
              },
              createdAt: "2026-09-04T00:00:01.000Z",
            },
          ]),
        ),
      findActiveRun: () => Effect.succeed({ id: "run-1" }),
    });

    const result = await Effect.runPromise(hydrateChatBotSvc(store, owner, threadId));

    expect(result.activeRun).toEqual({ runId: "run-1" });
    expect(result.messages[0]?.parts[0]).toMatchObject({ type: "text", content: "How many?" });
    expect(result.messages[1]).toMatchObject({
      role: "assistant",
      parts: [{ type: "text", content: "That comes to **5**." }],
      metadata: {
        chatBot: {
          toolsUsed: ["addTwoNumbers"],
          structure: { addTwoNumbers: { results: [{ sum: 5 }] } },
        },
      },
    });
  });

  it("returns a null active run when the thread is idle", async () => {
    const store = storeWith({
      getThread: () => Effect.succeed(detail([])),
      findActiveRun: () => Effect.succeed(null),
    });

    expect(await Effect.runPromise(hydrateChatBotSvc(store, owner, threadId))).toEqual({
      messages: [],
      activeRun: null,
    });
  });

  it("fails with NotFound before reading runs when the thread is not the owner's", async () => {
    const findActiveRun = vi.fn<ChatBotStore["findActiveRun"]>();
    const store = storeWith({
      getThread: () => Effect.fail(new ChatBotNotFound({ message: "Chat thread not found" })),
      findActiveRun,
    });

    const error = await Effect.runPromise(Effect.flip(hydrateChatBotSvc(store, owner, threadId)));

    expect(error).toBeInstanceOf(ChatBotNotFound);
    expect(findActiveRun).not.toHaveBeenCalled();
  });
});

describe("hydrateOrJoinChatBotSvc", () => {
  const run = (store: ChatBotStore, streams: ChatBotDurableStreams, id: string | undefined, request: Request) =>
    Effect.runPromise(hydrateOrJoinChatBotSvc(store, streams, owner, id, request));
  const fail = (store: ChatBotStore, streams: ChatBotDurableStreams, id: string | undefined, request: Request) =>
    Effect.runPromise(Effect.flip(hydrateOrJoinChatBotSvc(store, streams, owner, id, request)));

  it("returns the bare hydrate body TanStack AI reads", async () => {
    const store = storeWith({
      getThread: () => Effect.succeed(detail([])),
      findActiveRun: () => Effect.succeed({ id: "run-1" }),
    });

    const response = await run(
      store,
      memoryStreams(),
      threadId,
      new Request(`https://chat.local/?threadId=${threadId}`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ messages: [], activeRun: { runId: "run-1" } });
  });

  it("fails with Invalid for a hydrate with no threadId, before any read", async () => {
    const getThread = vi.fn<ChatBotStore["getThread"]>();

    const error = await fail(storeWith({ getThread }), memoryStreams(), undefined, new Request("https://chat.local/"));

    expect(error).toBeInstanceOf(ChatBotInvalid);
    expect(getThread).not.toHaveBeenCalled();
  });

  it("joins the owner's run when the request carries an offset", async () => {
    const streams = memoryStreams();
    await streams({ runId: "run-1" }).close();
    const store = storeWith({ lookupRun: () => Effect.succeed({ id: "run-1", threadId }) });

    const response = await run(
      store,
      streams,
      undefined,
      new Request("https://chat.local/?runId=run-1&offset=-1"),
    );

    expect(response.headers.get("X-Thread-Id")).toBe(threadId);
  });

  it("fails with NotFound when joining a run that isn't the owner's", async () => {
    const store = storeWith({ lookupRun: () => Effect.succeed(null) });

    const error = await fail(
      store,
      memoryStreams(),
      undefined,
      new Request("https://chat.local/?runId=run-1&offset=-1"),
    );

    expect(error).toBeInstanceOf(ChatBotNotFound);
  });

  it("fails with Invalid for a join whose Last-Event-ID points into another run", async () => {
    const store = storeWith({ lookupRun: () => Effect.succeed({ id: "run-1", threadId }) });

    const error = await fail(
      store,
      memoryStreams(),
      undefined,
      new Request("https://chat.local/?runId=run-1", {
        headers: { "Last-Event-ID": "pg:v1:victim-run:1" },
      }),
    );

    expect(error).toBeInstanceOf(ChatBotInvalid);
  });
});
