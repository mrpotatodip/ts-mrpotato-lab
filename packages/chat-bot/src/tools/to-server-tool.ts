import { toolDefinition } from "@tanstack/ai";
import { Cause, Effect, Exit, Ref } from "effect";
import {
  ChatBotJsonSchema,
  type ChatBotJson,
  type ChatBotToolError,
} from "@repo/contracts/chat-bots";
import type { ChatBotRuntime, ChatBotToolBudget, ChatBotToolSpec } from "../lib";
import {
  CHAT_BOT_MAX_TOOL_CALLS_PER_TURN,
  CHAT_BOT_TOOL_ERROR_FAILED,
  CHAT_BOT_TOOL_ERROR_INVALID_INPUT,
  CHAT_BOT_TOOL_ERROR_LIMIT_REACHED,
} from "./constants";
import { executeChatBotHttpTool } from "./http-executor";

// -----
// One budget per turn, shared by main and
// the child it hands off to.
// -----
export function createChatBotToolBudget(): Effect.Effect<ChatBotToolBudget> {
  return Ref.make(CHAT_BOT_MAX_TOOL_CALLS_PER_TURN);
}

// -----
// Spend a call from the budget, or answer
// { error } once the turn has used it up.
// -----
function callChatBotTool(
  spec: ChatBotToolSpec,
  input: ChatBotJson,
  runtime: ChatBotRuntime,
  budget: ChatBotToolBudget,
): Effect.Effect<ChatBotJson | ChatBotToolError> {
  return Effect.gen(function* () {
    const allowed = yield* Ref.modify(budget, (left): [boolean, number] =>
      left > 0 ? [true, left - 1] : [false, left],
    );
    if (!allowed) return { error: CHAT_BOT_TOOL_ERROR_LIMIT_REACHED };
    return yield* executeChatBotHttpTool(spec, input, runtime);
  });
}

// -----
// TanStack awaits this callback: the run point,
// and the boundary where model input is parsed.
// -----
export function toChatBotServerTool(
  spec: ChatBotToolSpec,
  runtime: ChatBotRuntime,
  budget: ChatBotToolBudget,
) {
  return toolDefinition({
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
  }).server(async (raw): Promise<ChatBotJson | ChatBotToolError> => {
    const input = ChatBotJsonSchema.safeParse(raw);
    if (!input.success) return { error: CHAT_BOT_TOOL_ERROR_INVALID_INPUT };
    const exit = await Effect.runPromiseExit(callChatBotTool(spec, input.data, runtime, budget));
    if (Exit.isSuccess(exit)) return exit.value;
    console.error("chat-bot: tool failed", spec.name, Cause.pretty(exit.cause));
    return { error: CHAT_BOT_TOOL_ERROR_FAILED };
  });
}
