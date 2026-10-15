import { chat, defineAgent, type StreamChunk } from "@tanstack/ai";
import { Data, Effect, Stream } from "effect";
import { createChatBotToolBudget, toChatBotServerTool } from "../tools/server-tool";
import type {
  ChatBotChat,
  ChatBotChatOptions,
  ChatBotInput,
  ChatBotModelOptions,
  ChatBotRuntime,
  ChatBotServices,
  ChatBotSubagent,
  ChatBotSubagentInput,
  ChatBotSubagents,
  ChatBotToolBudget,
} from "../types";
import { CHAT_BOT_CONTRACT_PROMPT } from "./contract-prompt";
import { chatBotSpecialistMiddleware } from "./specialist-middleware";

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
// A child as TanStack's defineAgent: its run
// is its own chat(), tied to the parent run.
// -----
export function toChatBotSubagent<S extends ChatBotServices>(
  subagent: ChatBotSubagentInput<S>,
  runtime: ChatBotRuntime<S>,
  budget: ChatBotToolBudget,
  run: ChatBotChat = streamChat,
): ChatBotSubagent {
  return defineAgent({
    name: subagent.name,
    description: subagent.description,
    run: (ctx) =>
      run({
        adapter: subagent.adapter,
        messages: ctx.messages,
        modelOptions: toModelOptions(subagent.temperature),
        systemPrompts: [...subagent.prompts],
        tools: subagent.tools.map((spec) => toChatBotServerTool(spec, runtime, budget)),
        threadId: ctx.threadId,
        runId: ctx.runId,
        parentRunId: ctx.parentRunId,
        subagentRunId: ctx.subagentRunId,
        resume: ctx.resume,
        stream: true,
      }),
  });
}

// -----
// Handoff: the router's children run first,
// then main answers with their text. No
// router means main answers alone.
// -----
function toChatBotSubagents<S extends ChatBotServices>(
  input: ChatBotInput<S>,
  budget: ChatBotToolBudget,
  run: ChatBotChat,
): ChatBotSubagents | undefined {
  const subagents = input.subagents ?? [];
  if (!input.route || subagents.length === 0) return undefined;
  return {
    agents: subagents.map((subagent) => toChatBotSubagent(subagent, input.runtime, budget, run)),
    router: input.route,
    strategy: "handoff",
  };
}

// -----
// One chat() for the whole turn. Main and its
// children share one tool budget.
// -----
export function runChatBot<S extends ChatBotServices>(
  input: ChatBotInput<S>,
  run: ChatBotChat = streamChat,
): Stream.Stream<StreamChunk, ChatBotModelError> {
  return Stream.unwrap(
    Effect.gen(function* () {
      const budget = yield* createChatBotToolBudget();
      return Stream.suspend(() =>
        Stream.fromAsyncIterable(
          run({
            adapter: input.adapter,
            messages: input.messages,
            agentLoopStrategy: input.agentLoopStrategy,
            debug: input.debug,
            modelOptions: toModelOptions(input.temperature),
            systemPrompts: [...input.prompts, CHAT_BOT_CONTRACT_PROMPT],
            tools: input.tools.map((spec) => toChatBotServerTool(spec, input.runtime, budget)),
            subagents: toChatBotSubagents(input, budget, run),
            middleware: [chatBotSpecialistMiddleware],
            stream: true,
          }),
          toModelError,
        ),
      );
    }),
  );
}
