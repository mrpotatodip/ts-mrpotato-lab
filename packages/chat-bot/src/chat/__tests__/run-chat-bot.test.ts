import { describe, it, expect, vi } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { Chunk, Effect, Stream } from "effect";
import { ChatBotOutputSchema } from "@repo/contracts/chat-bots";
import { ChatBotModelError, runChatBot, toChatBotSpecialistPrompt } from "../run-chat-bot";
import { CHAT_BOT_CONTRACT_PROMPT } from "../contract-prompt";
import { CHAT_BOT_MAIN_ROUTE } from "../constants";
import type {
  ChatBotChat,
  ChatBotChatOptions,
  ChatBotInput,
  ChatBotRouter,
  ChatBotSubagentInput,
} from "../types";
import type { ChatBotRuntime, ChatBotToolSpec } from "../../lib";

const addTwo: ChatBotToolSpec = {
  id: "tool-1",
  name: "addTwoNumbers",
  description: "Add two numbers.",
  method: "GET",
  path: "/chat-bot-tools/add-two-numbers",
  inputSchema: {
    type: "object",
    properties: { a: { type: "number" }, b: { type: "number" } },
    required: ["a", "b"],
  },
  resultSchema: null,
  display: null,
  displayOptions: null,
  timeoutMs: null,
};

// -----
// SAFETY: the fake chat never calls into
// an adapter; it is only passed through.
// -----
const childAdapter = { name: "child-adapter" } as never;

const calculator: ChatBotSubagentInput = {
  name: "calculator",
  description: "Adds numbers.",
  adapter: childAdapter,
  prompts: ["calculator persona"],
  tools: [addTwo],
  temperature: 0,
};

const MAIN_PROMPTS = ["main persona", "main guard rail"];

function input(overrides: Partial<ChatBotInput> = {}): ChatBotInput {
  return {
    // -----
    // SAFETY: the fake chat never calls into
    // an adapter; it is only wrapped.
    // -----
    adapter: {} as never,
    messages: [{ role: "user", content: "What is 2 plus 3?" }],
    prompts: MAIN_PROMPTS,
    tools: [addTwo],
    runtime: {
      userId: "user-1",
      allowedPathPrefix: "/chat-bot-tools/",
      fetch: vi.fn<ChatBotRuntime["fetch"]>(),
    },
    ...overrides,
  };
}

async function* streamOf(chunks: ReadonlyArray<StreamChunk>): AsyncIterable<StreamChunk> {
  for (const chunk of chunks) yield chunk;
}

// -----
// A fake chat(): main is the call with an
// outputSchema, the child the one without.
// -----
function fakeChat(child: ReadonlyArray<StreamChunk> = [], main: ReadonlyArray<StreamChunk> = []) {
  return vi.fn<ChatBotChat>((options) => streamOf(options.outputSchema ? main : child));
}

function drain(stream: Stream.Stream<StreamChunk, unknown>): Promise<StreamChunk[]> {
  return Effect.runPromise(Stream.runCollect(stream)).then(Chunk.toArray);
}

function mainOptions(chat: ReturnType<typeof fakeChat>): ChatBotChatOptions | undefined {
  return chat.mock.calls.at(-1)?.[0];
}

const childReply: ReadonlyArray<StreamChunk> = [
  { type: EventType.RUN_STARTED, runId: "child-run", threadId: "t", timestamp: 1 },
  { type: EventType.TOOL_CALL_START, toolCallId: "call-add", toolCallName: "addTwoNumbers", timestamp: 2 },
  { type: EventType.TEXT_MESSAGE_START, messageId: "m-child", timestamp: 3 },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m-child", delta: "2 + 3 = 5", timestamp: 4 },
  { type: EventType.TEXT_MESSAGE_END, messageId: "m-child", timestamp: 5 },
  { type: EventType.RUN_FINISHED, runId: "child-run", threadId: "t", timestamp: 6 },
];

describe("runChatBot", () => {
  it("uses the given prompts with the contract last", async () => {
    const chat = fakeChat();
    await drain(runChatBot(input({ prompts: ["persona v2", "guard v1"] }), chat));

    expect(mainOptions(chat)?.systemPrompts).toEqual([
      "persona v2",
      "guard v1",
      CHAT_BOT_CONTRACT_PROMPT,
    ]);
    expect(mainOptions(chat)?.outputSchema).toBe(ChatBotOutputSchema);
    expect(mainOptions(chat)?.stream).toBe(true);
    expect(mainOptions(chat)?.adapter.supportsCombinedToolsAndSchema?.()).toBe(false);
  });

  it("turns each spec into a named server tool", async () => {
    const chat = fakeChat();
    await drain(runChatBot(input(), chat));
    expect((mainOptions(chat)?.tools ?? []).map((tool) => tool.name)).toEqual(["addTwoNumbers"]);
  });

  it("passes temperature only when set", async () => {
    const warm = fakeChat();
    await drain(runChatBot(input({ temperature: 0.3 }), warm));
    expect(mainOptions(warm)?.modelOptions).toEqual({ temperature: 0.3 });

    const unset = fakeChat();
    await drain(runChatBot(input({ temperature: null }), unset));
    expect(mainOptions(unset)?.modelOptions).toBeUndefined();
  });

  it("never gives chat() subagents, which it refuses with outputSchema", async () => {
    const chat = fakeChat(childReply);
    const route = vi.fn<ChatBotRouter>(() => Effect.succeed("calculator"));

    await drain(runChatBot(input({ tools: [], subagents: [calculator], route }), chat));

    for (const [options] of chat.mock.calls) {
      expect(options).not.toHaveProperty("subagents");
    }
  });

  it("fails with ChatBotModelError when main's chat() throws", async () => {
    const chat = vi.fn<ChatBotChat>(async function* () {
      yield* [];
      throw new Error("model down");
    });

    const error = await Effect.runPromise(Effect.flip(Stream.runDrain(runChatBot(input(), chat))));

    expect(error).toBeInstanceOf(ChatBotModelError);
    expect(error.message).toBe("model down");
  });

  describe("routing", () => {
    it("runs main alone when the router picks main", async () => {
      const chat = fakeChat();
      const route = vi.fn<ChatBotRouter>(() => Effect.succeed(CHAT_BOT_MAIN_ROUTE));

      await drain(runChatBot(input({ subagents: [calculator], route }), chat));

      expect(route).toHaveBeenCalledWith({
        messages: [{ role: "user", content: "What is 2 plus 3?" }],
        agents: [{ name: "calculator", description: "Adds numbers." }],
      });
      expect(chat).toHaveBeenCalledTimes(1);
    });

    it("skips the router when there are no children", async () => {
      const route = vi.fn<ChatBotRouter>(() => Effect.succeed("calculator"));
      await drain(runChatBot(input({ route }), fakeChat()));
      expect(route).not.toHaveBeenCalled();
    });

    it("runs main alone when the router names an unknown agent", async () => {
      const chat = fakeChat();
      const route = vi.fn<ChatBotRouter>(() => Effect.succeed("pricing"));
      await drain(runChatBot(input({ subagents: [calculator], route }), chat));
      expect(chat).toHaveBeenCalledTimes(1);
    });

    it("streams the picked child as a subagent, then hands its reply to main", async () => {
      const chat = fakeChat(childReply);
      const route = vi.fn<ChatBotRouter>(() => Effect.succeed("calculator"));

      const chunks = await drain(
        runChatBot(input({ tools: [], subagents: [calculator], route }), chat),
      );

      // -----
      // The child's own chat(): its prompts,
      // tools and model, and no schema.
      // -----
      const child = chat.mock.calls[0]?.[0];
      expect(child?.adapter).toBe(childAdapter);
      expect(child?.systemPrompts).toEqual(["calculator persona"]);
      expect((child?.tools ?? []).map((tool) => tool.name)).toEqual(["addTwoNumbers"]);
      expect(child?.modelOptions).toEqual({ temperature: 0 });
      expect(child?.outputSchema).toBeUndefined();

      const types = chunks.map((chunk) => chunk.type);
      expect(types[0]).toBe(EventType.SUBAGENT_STARTED);
      expect(types.at(-1)).toBe(EventType.SUBAGENT_FINISHED);
      expect(types).not.toContain(EventType.RUN_STARTED);
      expect(types).not.toContain(EventType.RUN_FINISHED);
      const started = chunks[0];
      const subagentRunId =
        started?.type === EventType.SUBAGENT_STARTED ? started.subagentRunId : undefined;
      expect(subagentRunId).toBeTruthy();
      for (const chunk of chunks.slice(1, -1)) {
        expect(chunk).toHaveProperty("subagentRunId", subagentRunId);
      }

      // -----
      // Main runs last; the child's reply is a
      // system prompt, never a chat message.
      // -----
      expect(mainOptions(chat)?.outputSchema).toBe(ChatBotOutputSchema);
      expect(mainOptions(chat)?.messages).toEqual([
        { role: "user", content: "What is 2 plus 3?" },
      ]);
      expect(mainOptions(chat)?.systemPrompts).toEqual([
        ...MAIN_PROMPTS,
        toChatBotSpecialistPrompt("calculator", "2 + 3 = 5"),
        CHAT_BOT_CONTRACT_PROMPT,
      ]);
      expect(toChatBotSpecialistPrompt("calculator", "2 + 3 = 5")).toBe(
        "Specialist result for this turn, from calculator:\n2 + 3 = 5",
      );
    });

    it("reports a failed child and still lets main answer", async () => {
      const chat = fakeChat([{ type: EventType.RUN_ERROR, message: "model down", timestamp: 1 }]);
      const route = vi.fn<ChatBotRouter>(() => Effect.succeed("calculator"));

      const chunks = await drain(
        runChatBot(input({ tools: [], subagents: [calculator], route }), chat),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        EventType.SUBAGENT_STARTED,
        EventType.SUBAGENT_ERROR,
      ]);
      expect(chunks[1]).toHaveProperty("message", "model down");
      expect(chat).toHaveBeenCalledTimes(2);
      expect(mainOptions(chat)?.systemPrompts).toEqual([...MAIN_PROMPTS, CHAT_BOT_CONTRACT_PROMPT]);
    });

    it("drops a child's partial reply when it fails midway", async () => {
      const chat = fakeChat([
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m", delta: "2 + 3", timestamp: 1 },
        { type: EventType.RUN_ERROR, message: "model down", timestamp: 2 },
      ]);
      const route = vi.fn<ChatBotRouter>(() => Effect.succeed("calculator"));

      await drain(runChatBot(input({ tools: [], subagents: [calculator], route }), chat));

      expect(mainOptions(chat)?.systemPrompts).toEqual([...MAIN_PROMPTS, CHAT_BOT_CONTRACT_PROMPT]);
    });
  });
});
