import { describe, it, expect, vi } from "vitest";
import {
  EventType,
  toolDefinition,
  type AdapterYieldChunk,
  type DefaultMessageMetadataByModality,
  type StreamChunk,
  type TextOptions,
} from "@tanstack/ai";
import { BaseTextAdapter, type StructuredOutputResult } from "@tanstack/ai/adapters";
import { Chunk, Effect, Stream } from "effect";
import { z } from "zod";
import {
  CHAT_BOT_CONTRACT_PROMPT,
  ChatBotModelError,
  defineChatBotTool,
  runChatBot,
} from "#/modules/chat-bot/lib";
import {
  chatBotSpecialistMiddleware,
  toChatBotSpecialistPrompt,
} from "../chat-bot-specialist-middleware";
import type {
  ChatBotAdapter,
  ChatBotChat,
  ChatBotChatOptions,
  ChatBotInput,
  ChatBotRouter,
  ChatBotSubagentInput,
} from "#/modules/chat-bot/types";

const addTwo = defineChatBotTool({
  definition: toolDefinition({
    name: "addTwoNumbers",
    description: "Add two numbers.",
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.object({ a: z.number(), b: z.number(), sum: z.number() }),
  }),
  run: ({ a, b }) => ({ a, b, sum: a + b }),
});

// -----
// A model that streams one fixed reply, or
// throws, and records what each call got.
// -----
class FakeAdapter extends BaseTextAdapter<
  "fake",
  Record<string, never>,
  readonly ["text"],
  DefaultMessageMetadataByModality
> {
  readonly name = "fake";
  readonly calls: Array<Pick<TextOptions, "systemPrompts" | "messages">> = [];

  constructor(private readonly reply: string | Error) {
    super({}, "fake");
  }

  async *chatStream(options: TextOptions): AsyncIterable<AdapterYieldChunk> {
    this.calls.push({ systemPrompts: options.systemPrompts, messages: options.messages });
    if (this.reply instanceof Error) throw this.reply;
    const messageId = `m-${this.reply}`;
    yield { type: EventType.RUN_STARTED, runId: "r", threadId: "t", timestamp: 1 };
    yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant", timestamp: 2 };
    yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: this.reply, timestamp: 3 };
    yield { type: EventType.TEXT_MESSAGE_END, messageId, timestamp: 4 };
    yield {
      type: EventType.RUN_FINISHED,
      runId: "r",
      threadId: "t",
      finishReason: "stop",
      timestamp: 5,
    };
  }

  structuredOutput(): Promise<StructuredOutputResult> {
    return Promise.resolve({ data: {}, rawText: "{}" });
  }
}

function calculator(adapter: ChatBotAdapter): ChatBotSubagentInput {
  return {
    name: "calculator",
    description: "Adds numbers.",
    adapter,
    prompts: ["calculator persona"],
    tools: [addTwo],
    temperature: 0,
  };
}

const MAIN_PROMPTS = ["main persona", "main guard rail"];
const QUESTION = { role: "user" as const, content: "What is 2 plus 3?" };

function input(overrides: Partial<ChatBotInput> = {}): ChatBotInput {
  return {
    adapter: new FakeAdapter("main"),
    messages: [QUESTION],
    prompts: MAIN_PROMPTS,
    tools: [addTwo],
    runtime: { userId: "user-1" },
    ...overrides,
  };
}

async function* noChunks(): AsyncIterable<StreamChunk> {}

function stubChat() {
  return vi.fn<ChatBotChat>(() => noChunks());
}

function drain(stream: Stream.Stream<StreamChunk, unknown>): Promise<StreamChunk[]> {
  return Effect.runPromise(Stream.runCollect(stream)).then(Chunk.toArray);
}

function mainOptions(chat: ReturnType<typeof stubChat>): ChatBotChatOptions | undefined {
  return chat.mock.calls[0]?.[0];
}

const pickCalculator: ChatBotRouter = () => "calculator";

describe("runChatBot", () => {
  it("uses the given prompts with the contract last, as plain text", async () => {
    const chat = stubChat();
    await drain(runChatBot(input({ prompts: ["persona v2", "guard v1"] }), chat));

    expect(mainOptions(chat)?.systemPrompts).toEqual([
      "persona v2",
      "guard v1",
      CHAT_BOT_CONTRACT_PROMPT,
    ]);
    expect(mainOptions(chat)?.outputSchema).toBeUndefined();
    expect(mainOptions(chat)?.stream).toBe(true);
  });

  it("gives main the specialist middleware", async () => {
    const chat = stubChat();
    await drain(runChatBot(input(), chat));
    expect(mainOptions(chat)?.middleware).toEqual([chatBotSpecialistMiddleware]);
  });

  it("turns each spec into a named server tool", async () => {
    const chat = stubChat();
    await drain(runChatBot(input(), chat));
    expect((mainOptions(chat)?.tools ?? []).map((tool) => tool.name)).toEqual(["addTwoNumbers"]);
  });

  it("passes temperature only when set", async () => {
    const warm = stubChat();
    await drain(runChatBot(input({ temperature: 0.3 }), warm));
    expect(mainOptions(warm)?.modelOptions).toEqual({ temperature: 0.3 });

    const unset = stubChat();
    await drain(runChatBot(input({ temperature: null }), unset));
    expect(mainOptions(unset)?.modelOptions).toBeUndefined();
  });

  it("fails with ChatBotModelError when chat() throws", async () => {
    const chat = vi.fn<ChatBotChat>(async function* () {
      yield* [];
      throw new Error("model down");
    });

    const error = await Effect.runPromise(Effect.flip(Stream.runDrain(runChatBot(input(), chat))));

    expect(error).toBeInstanceOf(ChatBotModelError);
    expect(error.message).toBe("model down");
  });

  describe("subagents", () => {
    it("gives chat() no subagents without a router", async () => {
      const chat = stubChat();
      await drain(runChatBot(input({ subagents: [calculator(new FakeAdapter("c"))] }), chat));
      expect(mainOptions(chat)?.subagents).toBeUndefined();
    });

    it("gives chat() no subagents without children", async () => {
      const chat = stubChat();
      await drain(runChatBot(input({ route: pickCalculator }), chat));
      expect(mainOptions(chat)?.subagents).toBeUndefined();
    });

    it("hands chat() the children, the router and the handoff strategy", async () => {
      const chat = stubChat();
      await drain(
        runChatBot(
          input({ subagents: [calculator(new FakeAdapter("c"))], route: pickCalculator }),
          chat,
        ),
      );

      const bag = mainOptions(chat)?.subagents;
      expect(bag?.strategy).toBe("handoff");
      expect(bag?.router).toBe(pickCalculator);
      expect(bag?.agents.map(({ name, description }) => ({ name, description }))).toEqual([
        { name: "calculator", description: "Adds numbers." },
      ]);
    });

    it("runs a child as its own chat(), tied to the parent run", async () => {
      const chat = stubChat();
      const child = calculator(new FakeAdapter("c"));
      await drain(runChatBot(input({ subagents: [child], route: pickCalculator }), chat));

      const agent = mainOptions(chat)?.subagents?.agents[0];
      await agent?.run({
        input: undefined,
        messages: [QUESTION],
        threadId: "thread-1",
        runId: "child-run",
        parentRunId: "parent-run",
        subagentRunId: "sub-1",
      });

      const options = chat.mock.calls[1]?.[0];
      expect(options?.adapter).toBe(child.adapter);
      expect(options?.systemPrompts).toEqual(["calculator persona"]);
      expect((options?.tools ?? []).map((tool) => tool.name)).toEqual(["addTwoNumbers"]);
      expect(options?.modelOptions).toEqual({ temperature: 0 });
      expect(options).toMatchObject({
        messages: [QUESTION],
        threadId: "thread-1",
        runId: "child-run",
        parentRunId: "parent-run",
        subagentRunId: "sub-1",
        stream: true,
      });
    });
  });

  // -----
  // The real chat(): TanStack runs the router,
  // the child and then main, end to end.
  // -----
  describe("handoff through chat()", () => {
    it("streams the picked child, then main answers with its reply", async () => {
      const main = new FakeAdapter("2 + 3 is 5.");
      const child = new FakeAdapter("2 + 3 = 5");

      const chunks = await drain(
        runChatBot(
          input({
            adapter: main,
            tools: [],
            subagents: [calculator(child)],
            route: pickCalculator,
          }),
        ),
      );

      const started = chunks.find((chunk) => chunk.type === EventType.SUBAGENT_STARTED);
      expect(started).toMatchObject({ name: "calculator" });
      const subagentRunId = started && "subagentRunId" in started ? started.subagentRunId : "";
      const text = chunks.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT);
      expect(text).toEqual([
        expect.objectContaining({ delta: "2 + 3 = 5", subagentRunId }),
        expect.objectContaining({ delta: "2 + 3 is 5." }),
      ]);
      expect(text[1]).not.toHaveProperty("subagentRunId");

      // -----
      // Main runs after the child and reads its
      // reply in its instructions, not as a message.
      // -----
      expect(child.calls).toHaveLength(1);
      expect(main.calls).toHaveLength(1);
      expect(main.calls[0]?.messages).toEqual([expect.objectContaining(QUESTION)]);
      expect(main.calls[0]?.systemPrompts).toContain(toChatBotSpecialistPrompt("2 + 3 = 5"));
    });

    it("runs main alone when the router picks main", async () => {
      const main = new FakeAdapter("Hello!");
      const child = new FakeAdapter("unused");

      const chunks = await drain(
        runChatBot(
          input({
            adapter: main,
            subagents: [calculator(child)],
            route: () => "main",
          }),
        ),
      );

      expect(chunks.map((chunk) => chunk.type)).not.toContain(EventType.SUBAGENT_STARTED);
      expect(child.calls).toHaveLength(0);
      expect(main.calls).toHaveLength(1);
    });

    it("ends the turn with RUN_ERROR when the picked child fails", async () => {
      const main = new FakeAdapter("unused");

      const chunks = await drain(
        runChatBot(
          input({
            adapter: main,
            subagents: [calculator(new FakeAdapter(new Error("model down")))],
            route: pickCalculator,
          }),
        ),
      );

      const types = chunks.map((chunk) => chunk.type);
      expect(types).toContain(EventType.SUBAGENT_ERROR);
      expect(types.at(-1)).toBe(EventType.RUN_ERROR);
      expect(main.calls).toHaveLength(0);
    });
  });
});
