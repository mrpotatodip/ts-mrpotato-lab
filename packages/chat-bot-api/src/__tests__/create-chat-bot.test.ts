import { describe, expect, it, vi } from "vitest";
import { EventType, toolDefinition, type StreamChunk } from "@tanstack/ai";
import { Effect } from "effect";
import { z } from "zod";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";
import {
  createChatBot,
  createChatBotToolFactory,
  type ChatBotAgent,
  type ChatBotOwner,
  type ChatBotRunner,
} from "../index";
import { createMemoryChatBotStore } from "../memory";

// -----
// A whole host in a few lines: the memory store,
// the memory stream log and a fake model. If this
// reads cleanly, so does plugging in a real one.
// -----
const owner: ChatBotOwner = { kind: "user", scopeId: "acme", userId: "ada" };

// -----
// What this host hands every tool. Typing the
// engine with it once is all the glue there is.
// -----
type Services = { greeting: string };

const defineChatBotTool = createChatBotToolFactory<Services>();

const echoTool = defineChatBotTool({
  definition: toolDefinition({
    name: "echo",
    description: "Echo a word.",
    inputSchema: z.object({ word: z.string() }),
    outputSchema: z.object({ word: z.string() }),
  }),
  run: ({ word }) => ({ word }),
});

const agent: ChatBotAgent<Services> = {
  id: "main",
  name: "main",
  description: "Test agent.",
  model: "any-model",
  temperature: null,
  prompts: ["be brief"],
  tools: [echoTool],
  subagents: [],
};

async function* reply(...deltas: string[]): AsyncGenerator<StreamChunk> {
  for (const delta of deltas) {
    yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta };
  }
}

async function* broken(): AsyncGenerator<StreamChunk> {
  yield* [];
  throw new Error("model exploded");
}

const setup = (answer: () => AsyncIterable<StreamChunk> = () => reply("Hel", "lo")) => {
  const store = createMemoryChatBotStore();
  const log = memoryChatBotDurableStreamStore();
  const jobs: Array<Promise<void>> = [];
  const runner = {
    run: vi.fn<ChatBotRunner<Services>["run"]>(() => answer()),
    // SAFETY: the fake runner never reads the adapter.
    adapterFor: () => "adapter" as never,
    route: undefined,
  } satisfies ChatBotRunner<Services>;
  const chat = createChatBot<Services>({
    store,
    runner,
    durableStream: (init) =>
      createChatBotDurableStream(log, { ...init, streamPrefix: "chat-bot" }),
    services: { greeting: "hi" },
    waitUntil: (job) => {
      jobs.push(job);
    },
  });
  const send = async (content: string, threadId?: string, runId?: string) => {
    const request = new Request("https://chat.local/", {
      method: "POST",
      headers: { "X-Run-Id": runId ?? crypto.randomUUID() },
    });
    const result = await Effect.runPromise(
      chat.start({
        agent,
        owner,
        body: { content, threadId, trigger: "chat", module: "chat" },
        request,
      }),
    );
    await Promise.all(jobs);
    return result;
  };
  return { chat, store, runner, send, jobs };
};

describe("createChatBot", () => {
  it("answers a message end to end: thread, stream, saved reply, hydrate", async () => {
    const { chat, store, send } = setup();

    const { threadId, runId } = await send("Hi there");

    const detail = await Effect.runPromise(chat.threads.get(owner, threadId));
    expect(detail.title).toBe("Hi there");
    expect(detail.messages.map((m) => [m.role, m.content])).toEqual([
      ["user", "Hi there"],
      ["assistant", "Hello"],
    ]);
    expect(await Effect.runPromise(store.findActiveRun(threadId))).toBeNull();

    const hydrate = await Effect.runPromise(chat.hydrate(owner, threadId));
    expect(hydrate.activeRun).toBeNull();
    expect(hydrate.messages.map((m) => m.parts[0]?.content)).toEqual(["Hi there", "Hello"]);
    expect(runId).toBeTruthy();
  });

  it("hands the model the host's services plus the owner and thread", async () => {
    const { runner, send } = setup();

    const { threadId } = await send("Hi");

    const input = runner.run.mock.calls[0]?.[0];
    expect(input?.runtime).toEqual({ greeting: "hi", owner, threadId });
    expect(input?.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("continues a thread: the model sees the earlier turns", async () => {
    const { runner, send } = setup();
    const first = await send("One");

    await send("Two", first.threadId);

    expect(runner.run.mock.calls[1]?.[0].messages).toEqual([
      { role: "user", content: "One" },
      { role: "assistant", content: "Hello" },
      { role: "user", content: "Two" },
    ]);
  });

  it("joins a finished run's stream from the start", async () => {
    const { chat, send } = setup();
    const { runId } = await send("Hi");

    const response = await Effect.runPromise(
      chat.join(
        owner,
        new Request("https://chat.local/?runId=" + runId, {
          headers: { "X-Run-Id": runId, "Last-Event-ID": "-1" },
        }),
      ),
    );
    const text = await response.text();

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain("Hel");
    expect(text).toContain("lo");
  });

  it("never shows another owner's thread or run", async () => {
    const { chat, send } = setup();
    const { threadId, runId } = await send("Secret");
    const stranger: ChatBotOwner = { kind: "user", scopeId: "acme", userId: "eve" };

    const get = await Effect.runPromise(Effect.either(chat.threads.get(stranger, threadId)));
    const join = await Effect.runPromise(
      Effect.either(
        chat.join(
          stranger,
          new Request("https://chat.local/?runId=" + runId, { headers: { "X-Run-Id": runId } }),
        ),
      ),
    );

    expect(get).toMatchObject({ _tag: "Left", left: { _tag: "NotFound" } });
    expect(join).toMatchObject({ _tag: "Left", left: { _tag: "NotFound" } });
  });

  it("renames and deletes through the same entry point", async () => {
    const { chat, send } = setup();
    const { threadId } = await send("Hi");

    const renamed = await Effect.runPromise(chat.threads.rename(owner, threadId, "Renamed"));
    const listed = await Effect.runPromise(chat.threads.list(owner));
    await Effect.runPromise(chat.threads.remove(owner, threadId));

    expect(renamed.title).toBe("Renamed");
    expect(listed.map((t) => t.id)).toContain(threadId);
    expect(await Effect.runPromise(chat.threads.list(owner))).toEqual([]);
  });

  it("answers a hydrate GET without a thread id with Invalid", async () => {
    const { chat } = setup();

    const result = await Effect.runPromise(
      Effect.either(
        chat.hydrateOrJoin({
          owner,
          threadId: undefined,
          request: new Request("https://chat.local/"),
        }),
      ),
    );

    expect(result).toMatchObject({ _tag: "Left", left: { _tag: "Invalid" } });
  });

  it("closes the run when the model throws, and saves no reply", async () => {
    const { chat, store, jobs } = setup(broken);

    const { threadId } = await Effect.runPromise(
      chat.start({
        agent,
        owner,
        body: { content: "Hi", trigger: "chat", module: "chat" },
        request: new Request("https://chat.local/", { headers: { "X-Run-Id": "run-x" } }),
      }),
    );
    await Promise.allSettled(jobs);

    const detail = await Effect.runPromise(store.getThread(owner, threadId));
    expect(detail.messages.map((m) => m.role)).toEqual(["user"]);
    expect(await Effect.runPromise(store.findActiveRun(threadId))).toBeNull();
  });
});
