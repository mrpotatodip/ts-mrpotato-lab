import { convertSchemaToJsonSchema, toolDefinition } from "@tanstack/ai";
import { Cause, Effect, Exit, Ref } from "effect";
import {
  ChatBotJsonSchema,
  type ChatBotJson,
  type ChatBotToolError,
} from "../contracts";
import {
  CHAT_BOT_MAX_TOOL_CALLS_PER_TURN,
  CHAT_BOT_TOOL_ERROR_FAILED,
  CHAT_BOT_TOOL_ERROR_INVALID_INPUT,
  CHAT_BOT_TOOL_ERROR_LIMIT_REACHED,
} from "../constants";
import type {
  ChatBotRuntime,
  ChatBotServices,
  ChatBotToolBudget,
  ChatBotToolSpec,
} from "../types";

// -----
// One budget per turn, shared by main and
// the child it hands off to.
// -----
export function createChatBotToolBudget(
  maxCalls: number = CHAT_BOT_MAX_TOOL_CALLS_PER_TURN,
): Effect.Effect<ChatBotToolBudget> {
  return Ref.make(maxCalls);
}

// -----
// Spend a call from the budget, or answer
// { error } once the turn has used it up.
// -----
function callChatBotTool<S extends ChatBotServices>(
  spec: ChatBotToolSpec<S>,
  input: ChatBotJson,
  runtime: ChatBotRuntime<S>,
  budget: ChatBotToolBudget,
): Effect.Effect<ChatBotJson | ChatBotToolError> {
  return Effect.gen(function* () {
    const allowed = yield* Ref.modify(budget, (left): [boolean, number] =>
      left > 0 ? [true, left - 1] : [false, left],
    );
    if (!allowed) return { error: CHAT_BOT_TOOL_ERROR_LIMIT_REACHED };
    return yield* spec.execute(input, runtime);
  });
}

// -----
// TanStack gets JSON Schema only, so it skips
// validation; the executor answers { error }.
// -----
export function toChatBotServerTool<S extends ChatBotServices>(
  spec: ChatBotToolSpec<S>,
  runtime: ChatBotRuntime<S>,
  budget: ChatBotToolBudget,
) {
  const { name, description, inputSchema } = spec.definition;
  return toolDefinition({
    name,
    description,
    inputSchema: convertSchemaToJsonSchema(inputSchema),
  }).server(async (raw): Promise<ChatBotJson | ChatBotToolError> => {
    const input = ChatBotJsonSchema.safeParse(raw);
    if (!input.success) return { error: CHAT_BOT_TOOL_ERROR_INVALID_INPUT };
    const exit = await Effect.runPromiseExit(callChatBotTool(spec, input.data, runtime, budget));
    if (Exit.isSuccess(exit)) return exit.value;
    console.error("chat-bot: tool failed", name, Cause.pretty(exit.cause));
    return { error: CHAT_BOT_TOOL_ERROR_FAILED };
  });
}
