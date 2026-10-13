import {
  ChatBotJsonSchema,
  ChatBotOutputSchema,
  type ChatBotJson,
} from "@repo/contracts/chat-bots";
import type { ParsedChatBotJson } from "./types";

function stripFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced?.[1]?.trim() ?? trimmed;
}

// -----
// null while the text isn't a whole JSON
// object yet, e.g. mid-stream.
// -----
function parseJsonObject(raw: string): ChatBotJson | null {
  const body = stripFence(raw);
  if (!body.startsWith("{")) return null;
  try {
    return ChatBotJsonSchema.parse(JSON.parse(body));
  } catch {
    return null;
  }
}

// -----
// True when the bubble is the chat-bot JSON
// object (complete or still streaming).
// -----
export function isChatBotJsonText(raw: string): boolean {
  if (raw.trim().startsWith("```")) return true;
  return stripFence(raw).startsWith("{");
}

// -----
// Turn a JSON string into the answer plus
// the typed output, or nulls.
// -----
export function parseChatBotJson(raw: string): ParsedChatBotJson {
  const output = ChatBotOutputSchema.safeParse(parseJsonObject(raw));
  return output.success
    ? { answer: output.data.answer, output: output.data }
    : { answer: null, output: null };
}
