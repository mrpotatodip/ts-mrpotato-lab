import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CHAT_BOT_MAIN_AGENT_ID,
  CHAT_BOT_STREAM_PREFIX,
} from "#/modules/chat-bot/constants";


import { EventType, toolDefinition, type StreamChunk } from "@tanstack/ai";
import { Effect } from "effect";
import { z } from "zod";
import {
  startChatBotRunSvc,
  streamChatBotSvc,
} from "#/modules/chat-bot/handlers";
import type {
  ChatBotAgent,
  ChatBotEnv,
  ChatBotRunner,
  ChatBotStreamQueries,
  ChatBotStreamRequest,
  ChatBotOwner,
} from "#/modules/chat-bot/types";
import { Conflict, DbError, Invalid, NotFound, runEffect } from "#/lib/effect-query";
import { InternalServiceError, NotFoundError } from "#/lib/errors";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
  type ChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";
import { chatBotDurableStreamOptions, defineChatBotTool } from "#/modules/chat-bot/lib";

// -----
// SAFETY: the handlers under test never
// call through to the db client.
// -----
const mockDb = {} as never;

// -----
// Stub query effects, passed in through the
// request; each test sets what they return.
// -----
const queries = {
  assertChatBotThreadLookupsEffect: vi.fn<ChatBotStreamQueries["assertChatBotThreadLookupsEffect"]>(),
  closeChatBotRunEffect: vi.fn<ChatBotStreamQueries["closeChatBotRunEffect"]>(),
  extendAnonymousChatBotThreadEffect: vi.fn<ChatBotStreamQueries["extendAnonymousChatBotThreadEffect"]>(),
  findChatBotThreadEffect: vi.fn<ChatBotStreamQueries["findChatBotThreadEffect"]>(),
  insertChatBotAssistantMessageEffect: vi.fn<ChatBotStreamQueries["insertChatBotAssistantMessageEffect"]>(),
  insertChatBotRunEffect: vi.fn<ChatBotStreamQueries["insertChatBotRunEffect"]>(),
  insertChatBotThreadWithRunEffect: vi.fn<ChatBotStreamQueries["insertChatBotThreadWithRunEffect"]>(),
  insertChatBotUserMessageEffect: vi.fn<ChatBotStreamQueries["insertChatBotUserMessageEffect"]>(),
  listChatBotMessagesForModelEffect: vi.fn<ChatBotStreamQueries["listChatBotMessagesForModelEffect"]>(),
  lookupChatBotRunEffect: vi.fn<ChatBotStreamQueries["lookupChatBotRunEffect"]>(),
  recordChatBotRunUsageEffect: vi.fn<ChatBotStreamQueries["recordChatBotRunUsageEffect"]>(),
} satisfies ChatBotStreamQueries;

const {
  assertChatBotThreadLookupsEffect,
  closeChatBotRunEffect,
  extendAnonymousChatBotThreadEffect,
  findChatBotThreadEffect,
  insertChatBotAssistantMessageEffect,
  insertChatBotRunEffect,
  insertChatBotThreadWithRunEffect,
  insertChatBotUserMessageEffect,
  listChatBotMessagesForModelEffect,
  lookupChatBotRunEffect,
  recordChatBotRunUsageEffect,
} = queries;

const owner: ChatBotOwner = {
  kind: "user",
  tenantId: "99999999-9999-4999-8999-999999999999",
  userId: "user-1",
};

// -----
// SAFETY: the stub runner never calls into
// the adapter it is handed.
// -----
const fakeAdapter = "fake-adapter" as never;

const runner = {
  run: vi.fn<ChatBotRunner["run"]>(),
  adapterFor: vi.fn<ChatBotRunner["adapterFor"]>(() => fakeAdapter),
  route: undefined,
} satisfies ChatBotRunner;

const { run: runChatBot, adapterFor } = runner;

const streamKey = (runId: string) => ({ streamPrefix: CHAT_BOT_STREAM_PREFIX, runId });

const dbDown = () => new DbError({ cause: new Error("db down") });

async function* failingStream() {
  yield { type: "TOOL_CALL_START", toolCallId: "call-1", toolCallName: "addTwoNumbers" };
  throw new Error("model exploded");
}


const env: ChatBotEnv = {
  OPENAI_API_KEY: "sk-fake",
  TYPESAFE_API_KEY: "",
};

// -----
// Main's reply, streamed in two deltas; it
// has no subagentRunId, so it is the answer.
// -----
const mainReplyChunks: ReadonlyArray<StreamChunk> = [
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m-main", delta: "That comes " },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m-main", delta: "to **5**." },
];

async function* fakeStream() {
  yield { type: "TOOL_CALL_START", toolCallId: "call-1", toolCallName: "addTwoNumbers" };
  yield { type: "TOOL_CALL_RESULT", toolCallId: "call-1", messageId: "m1", content: '{"a":2,"b":3,"sum":5}' };
  yield* mainReplyChunks;
}

const addTwoTool = defineChatBotTool({
  definition: toolDefinition({
    name: "addTwoNumbers",
    description: "Add two numbers.",
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.object({ a: z.number(), b: z.number(), sum: z.number() }),
  }),
  run: ({ a, b }) => ({ a, b, sum: a + b }),
});

// -----
// A small agent, not the real config, so
// tests don't break when prompts change.
// -----
const testAgent: ChatBotAgent = {
  id: CHAT_BOT_MAIN_AGENT_ID,
  name: "main",
  description: "Test main agent.",
  model: "gpt-4o-mini",
  temperature: null,
  prompts: ["persona v1", "guard v1"],
  tools: [addTwoTool],
  subagents: [],
};

function freshRequest(): Request {
  return new Request("https://chat.local/", {
    method: "POST",
    headers: { "X-Run-Id": "run-1" },
  });
}

// -----
// The route's stream settings over a memory
// store; tests read the store back directly.
// -----
const streamRequest = ({
  log,
  ...fields
}: { log: ChatBotDurableStreamStore } & Pick<ChatBotStreamRequest, "body"> &
  Partial<ChatBotStreamRequest>): ChatBotStreamRequest => ({
  db: mockDb,
  queries,
  runner,
  durableStream: (init) =>
    createChatBotDurableStream(log, { ...init, ...chatBotDurableStreamOptions }),
  agent: testAgent,
  owner,
  env,
  waitUntil: vi.fn<ChatBotStreamRequest["waitUntil"]>(),
  request: freshRequest(),
  ...fields,
});

const runStream = (fields: Parameters<typeof streamRequest>[0]) =>
  Effect.runPromise(startChatBotRunSvc(streamRequest(fields)));

const failStream = (fields: Parameters<typeof streamRequest>[0]) =>
  Effect.runPromise(Effect.flip(startChatBotRunSvc(streamRequest(fields))));

describe("startChatBotRunSvc", () => {
  let log: ChatBotDurableStreamStore;

  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.clearAllMocks();
    log = memoryChatBotDurableStreamStore();
    // -----
    // SAFETY: run is a stub; the service only
    // consumes its async iterator.
    // -----
    vi.mocked(runChatBot).mockReturnValue(fakeStream() as never);
    vi.mocked(listChatBotMessagesForModelEffect).mockReturnValue(Effect.succeed([
      { role: "user", content: "How many?" },
    ]));
    vi.mocked(insertChatBotThreadWithRunEffect).mockReturnValue(Effect.succeed({
      id: "11111111-1111-1111-1111-111111111111",
    }));
    vi.mocked(insertChatBotAssistantMessageEffect).mockReturnValue(Effect.void);
    vi.mocked(insertChatBotUserMessageEffect).mockReturnValue(Effect.succeed(undefined));
    vi.mocked(insertChatBotRunEffect).mockReturnValue(Effect.succeed(undefined));
    vi.mocked(closeChatBotRunEffect).mockReturnValue(Effect.void);
    vi.mocked(assertChatBotThreadLookupsEffect).mockReturnValue(Effect.succeed(undefined));
    vi.mocked(lookupChatBotRunEffect).mockReturnValue(Effect.succeed(null));
    vi.mocked(extendAnonymousChatBotThreadEffect).mockReturnValue(Effect.void);
    vi.mocked(recordChatBotRunUsageEffect).mockReturnValue(Effect.void);
  });

  it("seeds Title from the first user message when creating a thread", async () => {
    await runStream({
      log,
      body: { content: "How many cards am I watching on this list today?", trigger: "chat", module: "chat" },
    });

    expect(insertChatBotThreadWithRunEffect).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({ title: "How many cards am I watching on this" }),
    );
  });

  it("creates a thread, stores the user turn, and sends stored history to runChatBot", async () => {
    const jobs: Array<Promise<unknown>> = [];
    const result = await runStream({
      log,
      body: { content: "How many?", trigger: "chat", module: "chat" },
      waitUntil: (job) => {
        jobs.push(job);
      },
    });

    expect(insertChatBotThreadWithRunEffect).toHaveBeenCalledWith(mockDb, {
      owner,
      title: "How many?",
      trigger: "chat",
      module: "chat",
      runId: "run-1",
    });
    expect(assertChatBotThreadLookupsEffect).toHaveBeenCalledWith(
      mockDb,
      "chat",
      "chat",
    );
    expect(findChatBotThreadEffect).not.toHaveBeenCalled();
    expect(insertChatBotRunEffect).not.toHaveBeenCalled();
    expect(insertChatBotUserMessageEffect).toHaveBeenCalledWith(mockDb, {
      threadId: "11111111-1111-1111-1111-111111111111",
      tenantId: owner.tenantId,
      content: "How many?",
    });
    expect(listChatBotMessagesForModelEffect).toHaveBeenCalledWith(
      mockDb,
      "11111111-1111-1111-1111-111111111111",
      20,
    );
    expect(adapterFor).toHaveBeenCalledWith("gpt-4o-mini");
    expect(runChatBot).toHaveBeenCalledWith({
      adapter: "fake-adapter",
      messages: [{ role: "user", content: "How many?" }],
      prompts: ["persona v1", "guard v1"],
      tools: [addTwoTool],
      runtime: { db: mockDb, owner, threadId: "11111111-1111-1111-1111-111111111111" },
      temperature: null,
      subagents: [],
    });
    expect(result).toEqual({
      runId: "run-1",
      threadId: "11111111-1111-1111-1111-111111111111",
      offset: "-1",
    });

    await Promise.all(jobs);

    expect(insertChatBotAssistantMessageEffect).toHaveBeenCalledWith(mockDb, {
      threadId: "11111111-1111-1111-1111-111111111111",
      tenantId: owner.tenantId,
      content: "That comes to **5**.",
      toolsUsed: ["addTwoNumbers"],
      structure: {
        addTwoNumbers: {
          display: null,
          displayOptions: null,
          results: [{ a: 2, b: 3, sum: 5 }],
        },
      },
    });
    const logged = (await log.listAfter(streamKey("run-1"), 0)).map((row) => row.chunk);
    expect(logged).toContainEqual(
      expect.objectContaining({
        type: "CUSTOM",
        name: "chat-bot.tool-display",
        value: {
          toolCallId: "call-1",
          tool: "addTwoNumbers",
          display: null,
          displayOptions: null,
          result: { a: 2, b: 3, sum: 5 },
        },
      }),
    );
    expect(await log.isClosed(streamKey("run-1"))).toBe(true);
    expect(closeChatBotRunEffect).toHaveBeenCalledWith(mockDb, "run-1", "completed");
  });

  it("ends a failed run with a RUN_ERROR chunk before closing it", async () => {
    // -----
    // SAFETY: run is a stub; the service only
    // consumes its async iterator.
    // -----
    vi.mocked(runChatBot).mockReturnValue(failingStream() as never);
    const jobs: Array<Promise<unknown>> = [];

    await runStream({
      log,
      body: { content: "How many?", trigger: "chat", module: "chat" },
      waitUntil: (job) => {
        jobs.push(job);
      },
    });
    await Promise.allSettled(jobs);

    const logged = (await log.listAfter(streamKey("run-1"), 0)).map((row) => row.chunk);
    expect(logged.at(-1)).toEqual(
      expect.objectContaining({ type: "RUN_ERROR", runId: "run-1", message: "Chat run failed" }),
    );
    expect(await log.isClosed(streamKey("run-1"))).toBe(true);
    expect(closeChatBotRunEffect).toHaveBeenCalledWith(mockDb, "run-1", "failed");
  });

  it("keeps the turn's own error as the cause when closing the run also fails", async () => {
    // -----
    // SAFETY: run is a stub; the service only
    // consumes its async iterator.
    // -----
    vi.mocked(runChatBot).mockReturnValue(failingStream() as never);
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(closeChatBotRunEffect).mockReturnValue(Effect.fail(dbDown()));
    const jobs: Array<Promise<unknown>> = [];

    await runStream({
      log,
      body: { content: "How many?", trigger: "chat", module: "chat" },
      waitUntil: (job) => {
        jobs.push(job);
      },
    });
    const [produced] = await Promise.allSettled(jobs);

    expect(produced).toEqual({ status: "rejected", reason: new Error("model exploded") });
    expect(logged).toHaveBeenCalledWith("chat-bot: failed to close run", "run-1", expect.any(Error));
    logged.mockRestore();
  });

  describe("with a calculator subagent", () => {
    // -----
    // Main keeps only the shared guard rail and
    // no tools; the calculator owns addTwoNumbers.
    // -----
    const calculatorAgent: ChatBotAgent = {
      ...testAgent,
      subagents: [
        {
          id: "calculator1_77ed3418-c914-4ee2-bf95-1ea400e64ae8",
          name: "calculator",
          description: "Adds numbers.",
          model: "gpt-4o-mini",
          temperature: 0,
          prompts: ["calculator persona", "guard v1"],
          tools: [addTwoTool],
          subagents: [],
        },
      ],
      tools: [],
    };

    it("passes the child with its own prompts and tools", async () => {
      await runStream({
        log,
        agent: calculatorAgent,
        body: { content: "2 + 3?", trigger: "chat", module: "chat" },
      });

      const input = vi.mocked(runChatBot).mock.calls[0]?.[0];
      expect(input?.tools).toEqual([]);
      expect(input?.subagents).toEqual([
        {
          name: "calculator",
          description: "Adds numbers.",
          adapter: "fake-adapter",
          prompts: ["calculator persona", "guard v1"],
          tools: [addTwoTool],
          temperature: 0,
        },
      ]);
    });

    it("saves the child's tool card and main's reply, not the child's text", async () => {
      async function* handoffStream() {
        yield { type: "SUBAGENT_STARTED", subagentRunId: "sub-1", name: "calculator" };
        yield {
          type: "TOOL_CALL_START",
          toolCallId: "call-add",
          toolCallName: "addTwoNumbers",
          subagentRunId: "sub-1",
        };
        yield {
          type: "TOOL_CALL_RESULT",
          toolCallId: "call-add",
          messageId: "m-child",
          content: '{"a":2,"b":3,"sum":5}',
          subagentRunId: "sub-1",
        };
        yield {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "m-child",
          delta: "2 + 3 = 5",
          subagentRunId: "sub-1",
        };
        yield { type: "SUBAGENT_FINISHED", subagentRunId: "sub-1" };
        yield* mainReplyChunks;
      }
      // -----
      // SAFETY: run is a stub; the service only
      // consumes its async iterator.
      // -----
      vi.mocked(runChatBot).mockReturnValue(handoffStream() as never);
      const jobs: Array<Promise<unknown>> = [];

      await runStream({
        log,
        agent: calculatorAgent,
        body: { content: "2 + 3?", trigger: "chat", module: "chat" },
        waitUntil: (job) => {
          jobs.push(job);
        },
      });
      await Promise.all(jobs);

      expect(insertChatBotAssistantMessageEffect).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          content: "That comes to **5**.",
          toolsUsed: ["addTwoNumbers"],
          structure: {
            addTwoNumbers: {
              display: null,
              displayOptions: null,
              results: [{ a: 2, b: 3, sum: 5 }],
            },
          },
        }),
      );
    });
  });

  it("uses the agent's model and temperature", async () => {
    await runStream({
      log,
      agent: { ...testAgent, model: "gpt-4.1", temperature: 0.2 },
      body: { content: "Hi", trigger: "chat", module: "chat" },
    });

    expect(adapterFor).toHaveBeenCalledWith("gpt-4.1");
    expect(vi.mocked(runChatBot).mock.calls[0]?.[0].temperature).toBe(0.2);
  });

  it("reuses a thread the user owns", async () => {
    vi.mocked(findChatBotThreadEffect).mockReturnValue(Effect.succeed({
      id: "22222222-2222-2222-2222-222222222222",
      title: null,
      trigger: "chat",
      module: "chat",
    }));
    vi.mocked(listChatBotMessagesForModelEffect).mockReturnValue(Effect.succeed([
      { role: "user", content: "Earlier" },
      { role: "assistant", content: "Before" },
      { role: "user", content: "Again" },
    ]));

    const result = await runStream({
      log,
      body: {
        threadId: "22222222-2222-2222-2222-222222222222",
        content: "Again",
        trigger: "chat",
        module: "chat",
      },
    });

    expect(insertChatBotThreadWithRunEffect).not.toHaveBeenCalled();
    expect(assertChatBotThreadLookupsEffect).not.toHaveBeenCalled();
    expect(insertChatBotRunEffect).toHaveBeenCalledWith(mockDb, {
      runId: "run-1",
      threadId: "22222222-2222-2222-2222-222222222222",
    });
    expect(findChatBotThreadEffect).toHaveBeenCalledWith(
      mockDb,
      owner,
      "22222222-2222-2222-2222-222222222222",
    );
    expect(insertChatBotUserMessageEffect).toHaveBeenCalledWith(mockDb, {
      threadId: "22222222-2222-2222-2222-222222222222",
      tenantId: owner.tenantId,
      content: "Again",
    });
    expect(result.threadId).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("fails with Invalid for an unknown module, before creating a thread", async () => {
    vi.mocked(assertChatBotThreadLookupsEffect).mockReturnValue(Effect.fail(
      new Invalid({ message: "Unknown chat module: nope" }),
    ));

    const error = await failStream({
      log,
      body: { content: "Hi", trigger: "chat", module: "nope" },
    });

    expect(error).toBeInstanceOf(Invalid);
    expect(insertChatBotThreadWithRunEffect).not.toHaveBeenCalled();
    expect(insertChatBotRunEffect).not.toHaveBeenCalled();
  });

  it("fails with NotFound when the thread is missing or not owned", async () => {
    vi.mocked(findChatBotThreadEffect).mockReturnValue(Effect.fail(
      new NotFound({ message: "Chat thread not found" }),
    ));

    const error = await failStream({
      log,
      body: {
        threadId: "33333333-3333-3333-3333-333333333333",
        content: "Hi",
        trigger: "chat",
        module: "chat",
      },
    });

    expect(error).toBeInstanceOf(NotFound);
    expect(insertChatBotUserMessageEffect).not.toHaveBeenCalled();
    expect(runChatBot).not.toHaveBeenCalled();
  });

  it("does not store a new user turn when the client is resuming a run", async () => {
    vi.mocked(lookupChatBotRunEffect).mockReturnValue(Effect.succeed({
      id: "run-1",
      threadId: "11111111-1111-1111-1111-111111111111",
    }));

    const result = await runStream({
      log,
      body: { content: "How many?", trigger: "chat", module: "chat" },
      request: new Request("https://chat.local/?offset=-1&runId=run-1", {
        method: "POST",
        headers: {
          "X-Run-Id": "run-1",
          "Last-Event-ID": "pg:v1:run-1:1",
        },
      }),
    });

    expect(result).toEqual({
      runId: "run-1",
      threadId: "11111111-1111-1111-1111-111111111111",
      offset: "pg:v1:run-1:1",
    });
    expect(insertChatBotUserMessageEffect).not.toHaveBeenCalled();
    expect(runChatBot).not.toHaveBeenCalled();
    expect(lookupChatBotRunEffect).toHaveBeenCalledWith(mockDb, owner, "run-1");
  });

  it("still starts a producer when the request carries an offset for an unknown run", async () => {
    const waitUntil = vi.fn<ChatBotStreamRequest["waitUntil"]>();
    await runStream({
      log,
      body: { content: "How many?", trigger: "chat", module: "chat" },
      waitUntil,
      request: new Request("https://chat.local/?offset=-1&runId=run-1", {
        method: "POST",
        headers: { "X-Run-Id": "run-1" },
      }),
    });

    expect(insertChatBotUserMessageEffect).toHaveBeenCalled();
    expect(runChatBot).toHaveBeenCalled();
    expect(waitUntil).toHaveBeenCalled();
  });

  describe("chunk pruning", () => {
    // -----
    // Now is 10:11. old-run closed at 10:00, past
    // the 10-minute window; recent-run at 10:06.
    // -----
    async function seedRunsEitherSideOfRetention(): Promise<void> {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-09-30T10:00:00.000Z"));
      await log.append(streamKey("old-run"), [mainReplyChunks[0]]);
      await log.close(streamKey("old-run"));
      vi.setSystemTime(new Date("2026-09-30T10:06:00.000Z"));
      await log.append(streamKey("recent-run"), [mainReplyChunks[0]]);
      await log.close(streamKey("recent-run"));
      vi.setSystemTime(new Date("2026-09-30T10:11:00.000Z"));
    }

    it("sweeps only runs that finished over ten minutes ago when a fresh turn closes", async () => {
      await seedRunsEitherSideOfRetention();
      const jobs: Array<Promise<unknown>> = [];

      await runStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
        waitUntil: (job) => {
          jobs.push(job);
        },
      });
      await Promise.all(jobs);

      expect(await log.listAfter(streamKey("old-run"), 0)).toEqual([]);
      expect(await log.listAfter(streamKey("recent-run"), 0)).toHaveLength(1);
      expect(await log.listAfter(streamKey("run-1"), 0)).not.toEqual([]);
    });

    it("leaves old chunks alone when the client is resuming", async () => {
      await seedRunsEitherSideOfRetention();
      vi.mocked(lookupChatBotRunEffect).mockReturnValue(Effect.succeed({
        id: "run-1",
        threadId: "11111111-1111-1111-1111-111111111111",
      }));

      await runStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(await log.listAfter(streamKey("old-run"), 0)).toHaveLength(1);
    });
  });

  it("rejects an offset into another run before reading or writing anything", async () => {
    const error = await failStream({
      log,
      body: { content: "How many?", trigger: "chat", module: "chat" },
      request: new Request("https://chat.local/", {
        method: "POST",
        headers: { "X-Run-Id": "run-1", "Last-Event-ID": "pg:v1:victim-run:1" },
      }),
    });

    expect(error).toBeInstanceOf(Invalid);
    expect(lookupChatBotRunEffect).not.toHaveBeenCalled();
    expect(insertChatBotThreadWithRunEffect).not.toHaveBeenCalled();
    expect(runChatBot).not.toHaveBeenCalled();
  });

  describe("run claim", () => {
    it("fails with Conflict on a new thread when the run id is taken, and writes nothing to it", async () => {
      vi.mocked(insertChatBotThreadWithRunEffect).mockReturnValue(
        Effect.fail(new Conflict({ message: "Chat run already exists" })),
      );

      const error = await failStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(error).toBeInstanceOf(Conflict);
      expect(insertChatBotUserMessageEffect).not.toHaveBeenCalled();
      expect(closeChatBotRunEffect).not.toHaveBeenCalled();
      expect(runChatBot).not.toHaveBeenCalled();
    });

    it("fails with Conflict on an existing thread when the run id is taken", async () => {
      vi.mocked(findChatBotThreadEffect).mockReturnValue(
        Effect.succeed({
          id: "22222222-2222-2222-2222-222222222222",
          title: null,
          trigger: "chat",
          module: "chat",
        }),
      );
      vi.mocked(insertChatBotRunEffect).mockReturnValue(
        Effect.fail(new Conflict({ message: "Chat run already exists" })),
      );

      const error = await failStream({
        log,
        body: { threadId: "22222222-2222-2222-2222-222222222222", content: "Again", trigger: "chat", module: "chat" },
      });

      expect(error).toBeInstanceOf(Conflict);
      expect(insertChatBotUserMessageEffect).not.toHaveBeenCalled();
      expect(closeChatBotRunEffect).not.toHaveBeenCalled();
    });

    it("closes the claimed run as failed when a later setup write fails", async () => {
      vi.mocked(insertChatBotUserMessageEffect).mockReturnValue(
        Effect.fail(new DbError({ cause: new Error("db down") })),
      );

      const error = await failStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(error).toBeInstanceOf(DbError);
      expect(closeChatBotRunEffect).toHaveBeenCalledWith(mockDb, "run-1", "failed");
      expect(await log.isClosed(streamKey("run-1"))).toBe(true);
      expect(runChatBot).not.toHaveBeenCalled();
    });

    it("still reports the setup error, and logs it, when closing the run also fails", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.mocked(listChatBotMessagesForModelEffect).mockReturnValue(
        Effect.fail(new DbError({ cause: new Error("read failed") })),
      );
      vi.mocked(closeChatBotRunEffect).mockReturnValue(
        Effect.fail(new DbError({ cause: new Error("close failed") })),
      );

      const error = await failStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(error).toBeInstanceOf(DbError);
      expect(error).toHaveProperty("cause", new Error("read failed"));
      expect(logged).toHaveBeenCalledWith(
        "chat-bot: failed to close run",
        "run-1",
        expect.stringContaining("DbError"),
      );
      logged.mockRestore();
    });

    it("leaves the run open when setup succeeds", async () => {
      await runStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(closeChatBotRunEffect).not.toHaveBeenCalled();
    });
  });

  describe("setup read retry", () => {
    it("retries a DbError on the setup reads, then answers", async () => {
      // -----
      // A retry re-runs the effect, not the call
      // that built it; suspend fails only once.
      // -----
      let attempts = 0;
      vi.mocked(assertChatBotThreadLookupsEffect).mockReturnValue(
        Effect.suspend(() => {
          attempts += 1;
          return attempts === 1 ? Effect.fail(dbDown()) : Effect.succeed(undefined);
        }),
      );

      const result = await runStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(attempts).toBe(2);
      expect(result.runId).toBe("run-1");
      expect(runChatBot).toHaveBeenCalledOnce();
    });

    it("retries a DbError on the run lookup too", async () => {
      let attempts = 0;
      vi.mocked(lookupChatBotRunEffect).mockReturnValue(
        Effect.suspend(() => {
          attempts += 1;
          return attempts === 1
            ? Effect.fail(dbDown())
            : Effect.succeed(null);
        }),
      );

      await runStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(attempts).toBe(2);
    });

    it("fails with DbError after the retries run out, writing nothing", async () => {
      vi.mocked(assertChatBotThreadLookupsEffect).mockReturnValue(Effect.fail(dbDown()));

      const error = await failStream({
        log,
        body: { content: "How many?", trigger: "chat", module: "chat" },
      });

      expect(error).toBeInstanceOf(DbError);
      expect(insertChatBotThreadWithRunEffect).not.toHaveBeenCalled();
      expect(runChatBot).not.toHaveBeenCalled();
    });
  });
});

describe("streamChatBotSvc run through runEffect", () => {
  const log = memoryChatBotDurableStreamStore();
  const call = () =>
    runEffect(
      streamChatBotSvc(
        streamRequest({
          log,
          body: { threadId: "33333333-3333-3333-3333-333333333333", content: "Hi", trigger: "chat", module: "chat" },
        }),
      ),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lookupChatBotRunEffect).mockReturnValue(Effect.succeed(null));
  });

  it("maps a NotFound tag to NotFoundError, so app.onError answers 404", async () => {
    vi.mocked(findChatBotThreadEffect).mockReturnValue(
      Effect.fail(new NotFound({ message: "Chat thread not found" })),
    );

    await expect(call()).rejects.toEqual(new NotFoundError("Chat thread not found"));
  });

  it("turns a defect into an InternalServiceError that keeps the cause", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(findChatBotThreadEffect).mockReturnValue(
      Effect.die(new Error("thread row drifted")),
    );

    const failing = call();

    await expect(failing).rejects.toBeInstanceOf(InternalServiceError);
    await expect(failing).rejects.toHaveProperty("cause", new Error("thread row drifted"));
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("thread row drifted"));
    logged.mockRestore();
  });
});
