import { convertSchemaToJsonSchema, toolDefinition } from "@tanstack/ai";
import { Cause, Effect, Exit } from "effect";
import {
  ChatBotJsonSchema,
  type ChatBotJson,
  type ChatBotToolError,
} from "../contracts";
import { CHAT_BOT_TOOL_ERROR_FAILED, CHAT_BOT_TOOL_ERROR_INVALID_INPUT } from "../constants";
import type { ChatBotRuntime, ChatBotServices, ChatBotToolSpec } from "../types";

// -----
// Same tool as the chat bot's, for an MCP
// server: no turn budget, one runtime per request.
// -----
export function toChatBotMcpTool<S extends ChatBotServices>(
  spec: ChatBotToolSpec<S>,
  runtime: ChatBotRuntime<S>,
) {
  const { name, description, inputSchema } = spec.definition;
  return toolDefinition({
    name,
    description,
    inputSchema: convertSchemaToJsonSchema(inputSchema),
  }).server(async (raw): Promise<ChatBotJson | ChatBotToolError> => {
    const input = ChatBotJsonSchema.safeParse(raw);
    if (!input.success) return { error: CHAT_BOT_TOOL_ERROR_INVALID_INPUT };
    const exit = await Effect.runPromiseExit(spec.execute(input.data, runtime));
    if (Exit.isSuccess(exit)) return exit.value;
    console.error("chat-bot: mcp tool failed", name, Cause.pretty(exit.cause));
    return { error: CHAT_BOT_TOOL_ERROR_FAILED };
  });
}

export const toChatBotMcpTools = <S extends ChatBotServices>(
  specs: ReadonlyArray<ChatBotToolSpec<S>>,
  runtime: ChatBotRuntime<S>,
) => specs.map((spec) => toChatBotMcpTool(spec, runtime));
