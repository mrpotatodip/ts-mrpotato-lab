import { z } from "zod";
import {
  ChatBotJsonSchema,
  type ChatBotJson,
  type ChatBotStructure,
  type ChatBotToolDisplayConfig,
} from "../contracts";

// -----
// TOOL_CALL_RESULT content is JSON text; keep
// raw text when it is not JSON.
// -----
export function parseChatBotToolResultContent(content: ChatBotJson): ChatBotJson {
  const text = z.string().safeParse(content);
  if (!text.success) return content;
  try {
    return ChatBotJsonSchema.parse(JSON.parse(text.data));
  } catch {
    return text.data;
  }
}

// -----
// One entry per tool: its display plus every
// call's result, in order.
// -----
export function appendChatBotToolResult(
  structure: ChatBotStructure,
  tool: string,
  entry: ChatBotToolDisplayConfig,
  result: ChatBotJson,
): ChatBotStructure {
  const current = structure[tool];
  return {
    ...structure,
    [tool]: {
      display: current?.display ?? entry.display,
      displayOptions: current?.displayOptions ?? entry.displayOptions,
      results: [...(current?.results ?? []), result],
    },
  };
}
