import { chat, EventType, type StreamChunk } from "@tanstack/ai";
import { Data, Effect, Ref, Stream } from "effect";
import { ChatBotOutputSchema, type ChatBotTurn } from "@repo/contracts/chat-bots";
import type { ChatBotRuntime, ChatBotToolBudget } from "../lib";
import { createChatBotToolBudget, toChatBotServerTool } from "../tools/to-server-tool";
import { CHAT_BOT_CONTRACT_PROMPT } from "./contract-prompt";
import type {
  ChatBotAdapter,
  ChatBotChat,
  ChatBotChatOptions,
  ChatBotInput,
  ChatBotModelOptions,
  ChatBotSubagentInput,
} from "./types";

export class ChatBotModelError extends Data.TaggedError("ChatBotModelError")<{
  message: string;
  cause: unknown;
}> {}

// -----
// The real chat(), pinned to streaming so
// it always returns chunks.
// -----
function streamChat(options: ChatBotChatOptions): AsyncIterable<StreamChunk> {
  return chat({ ...options, stream: true });
}

function toModelError(cause: unknown): ChatBotModelError {
  const message = cause instanceof Error ? cause.message : String(cause);
  return new ChatBotModelError({ message, cause });
}

function toModelOptions(temperature: number | null | undefined): ChatBotModelOptions {
  // -----
  // SAFETY: every adapter we build (OpenAI) takes
  // temperature; the generic type can't say so.
  // -----
  return (temperature == null ? undefined : { temperature }) as ChatBotModelOptions;
}

// -----
// OpenAI combined mode keeps tools on the
// JSON turn, so the object never arrives.
// -----
function withoutCombinedToolsAndSchema(adapter: ChatBotAdapter): ChatBotAdapter {
  // -----
  // SAFETY: the copy keeps the adapter's own
  // prototype, so it is the same adapter class.
  // -----
  const next = Object.create(Object.getPrototypeOf(adapter)) as ChatBotAdapter;
  Object.assign(next, adapter);
  next.supportsCombinedToolsAndSchema = () => false;
  return next;
}

// -----
// The router owns its fallback; a name that
// isn't one of this turn's children means main.
// -----
function pickSubagent(input: ChatBotInput): Effect.Effect<ChatBotSubagentInput | null> {
  return Effect.gen(function* () {
    const subagents = input.subagents ?? [];
    if (!input.route || subagents.length === 0) return null;
    const picked = yield* input.route({
      messages: input.messages,
      agents: subagents.map(({ name, description }) => ({ name, description })),
    });
    return subagents.find((subagent) => subagent.name === picked) ?? null;
  });
}

// -----
// The child's own chat(), wrapped and tagged;
// a failure is SUBAGENT_ERROR and main goes on.
// -----
function streamSubagent(
  run: ChatBotChat,
  subagent: ChatBotSubagentInput,
  messages: ReadonlyArray<ChatBotTurn>,
  runtime: ChatBotRuntime,
  budget: ChatBotToolBudget,
  reply: Ref.Ref<string>,
): Stream.Stream<StreamChunk> {
  const subagentRunId = crypto.randomUUID();
  const body = Stream.suspend(() =>
    Stream.fromAsyncIterable(
      run({
        adapter: subagent.adapter,
        messages: [...messages],
        modelOptions: toModelOptions(subagent.temperature),
        systemPrompts: [...subagent.prompts],
        tools: subagent.tools.map((spec) => toChatBotServerTool(spec, runtime, budget)),
        stream: true,
      }),
      toModelError,
    ),
  ).pipe(
    // -----
    // Its run events are dropped: the turn is
    // main's run, not the child's.
    // -----
    Stream.filter(
      (chunk) =>
        chunk.type !== EventType.RUN_STARTED &&
        chunk.type !== EventType.RUN_FINISHED &&
        chunk.type !== EventType.MESSAGES_SNAPSHOT,
    ),
    Stream.mapEffect((chunk) =>
      chunk.type === EventType.RUN_ERROR
        ? Effect.fail(toModelError(chunk.message))
        : Effect.succeed(chunk),
    ),
    Stream.tap((chunk) =>
      chunk.type === EventType.TEXT_MESSAGE_CONTENT
        ? Ref.update(reply, (text) => text + chunk.delta)
        : Effect.void,
    ),
    Stream.map((chunk): StreamChunk => ({ ...chunk, subagentRunId })),
  );

  return Stream.sync(
    (): StreamChunk => ({
      type: EventType.SUBAGENT_STARTED,
      subagentRunId,
      name: subagent.name,
      description: subagent.description,
      timestamp: new Date().getTime(),
    }),
  ).pipe(
    Stream.concat(body),
    Stream.concat(
      Stream.sync(
        (): StreamChunk => ({
          type: EventType.SUBAGENT_FINISHED,
          subagentRunId,
          timestamp: new Date().getTime(),
        }),
      ),
    ),
    Stream.catchTag("ChatBotModelError", (error) =>
      Stream.fromEffect(
        Ref.set(reply, "").pipe(
          Effect.map(
            (): StreamChunk => ({
              type: EventType.SUBAGENT_ERROR,
              subagentRunId,
              message: error.message,
              timestamp: new Date().getTime(),
            }),
          ),
        ),
      ),
    ),
  );
}

// -----
// Main writes the { answer }. The contract
// prompt goes last so it wins on format.
// -----
function streamMain(
  run: ChatBotChat,
  input: ChatBotInput,
  handoff: ReadonlyArray<string>,
  budget: ChatBotToolBudget,
): Stream.Stream<StreamChunk, ChatBotModelError> {
  return Stream.suspend(() =>
    Stream.fromAsyncIterable(
      run({
        adapter: withoutCombinedToolsAndSchema(input.adapter),
        messages: input.messages,
        agentLoopStrategy: input.agentLoopStrategy,
        debug: input.debug,
        modelOptions: toModelOptions(input.temperature),
        systemPrompts: [...input.prompts, ...handoff, CHAT_BOT_CONTRACT_PROMPT],
        tools: input.tools.map((spec) => toChatBotServerTool(spec, input.runtime, budget)),
        outputSchema: ChatBotOutputSchema,
        stream: true,
      }),
      toModelError,
    ),
  );
}

// -----
// A child's reply reaches main as a system
// prompt; chat history can be forged.
// -----
export function toChatBotSpecialistPrompt(name: string, reply: string): string {
  return `Specialist result for this turn, from ${name}:\n${reply}`;
}

// -----
// chat() refuses subagents with outputSchema,
// so a picked child runs first, then main.
// -----
export function runChatBot(
  input: ChatBotInput,
  run: ChatBotChat = streamChat,
): Stream.Stream<StreamChunk, ChatBotModelError> {
  return Stream.unwrap(
    Effect.gen(function* () {
      const budget = yield* createChatBotToolBudget();
      const subagent = yield* pickSubagent(input);
      if (!subagent) return streamMain(run, input, [], budget);

      const reply = yield* Ref.make("");
      const main = Stream.unwrap(
        Ref.get(reply).pipe(
          Effect.map((text) => {
            const answer = text.trim();
            const handoff = answer ? [toChatBotSpecialistPrompt(subagent.name, answer)] : [];
            return streamMain(run, input, handoff, budget);
          }),
        ),
      );
      return streamSubagent(run, subagent, input.messages, input.runtime, budget, reply).pipe(
        Stream.concat(main),
      );
    }),
  );
}
