import { z } from "zod";
import type { ChatBotJson } from "@repo/contracts/chat-bots";

import { ChatBotRowSchema, type ChatBotRow } from "../schemas";

export function toChatBotRow(value: ChatBotJson | undefined): ChatBotRow | null {
  if (Array.isArray(value)) return null;
  const parsed = ChatBotRowSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toChatBotRows(value: ChatBotJson | undefined): ChatBotRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = toChatBotRow(item);
    return row ? [row] : [];
  });
}

export function formatChatBotValue(value: ChatBotJson | undefined): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return `${value.length} items`;
  const number = z.number().safeParse(value);
  if (number.success) return number.data.toLocaleString();
  if (toChatBotRow(value)) return JSON.stringify(value);
  return String(value);
}

// -----
// camelCase or snake_case key to a label,
// e.g. "card_name" → "Card name".
// -----
export function toChatBotLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (first) => first.toUpperCase());
}

export function chatBotToolTitle(tool: string): string {
  return toChatBotLabel(tool);
}
