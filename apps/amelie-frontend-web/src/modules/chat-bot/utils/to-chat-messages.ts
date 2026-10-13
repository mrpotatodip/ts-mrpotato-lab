import type { ChatBotTurn } from "@repo/contracts/chat-bots";
import { isChatBotJsonText, parseChatBotJson } from "@repo/chat-bot/chat";

import type { ChatBotWirePayload } from "../schemas";

type ChatBotWireMessage = ChatBotWirePayload["messages"][number];
type ChatBotWirePart = NonNullable<ChatBotWireMessage["parts"]>[number];

function answerFromJson(value: string): string | null {
  return parseChatBotJson(value).answer;
}

function partText(part: ChatBotWirePart): string {
  if (part.type === "text") {
    const content = part.content ?? "";
    if (isChatBotJsonText(content)) {
      return parseChatBotJson(content).answer ?? "";
    }
    return content;
  }
  if (part.type === "structured-output") {
    if (part.data?.answer) return part.data.answer;
    if (!part.raw) return "";
    return answerFromJson(part.raw) ?? "";
  }
  return "";
}

function messageContent(item: ChatBotWireMessage): string {
  const fromParts = (item.parts ?? []).map(partText).join("").trim();
  if (fromParts) return fromParts;
  const content = item.content?.trim() ?? "";
  return answerFromJson(content) ?? content;
}

function mapMessage(item: ChatBotWireMessage): ChatBotTurn | null {
  if (item.role !== "user" && item.role !== "assistant") return null;
  const content = messageContent(item);
  if (!content) return null;
  return { role: item.role, content };
}

// -----
// Flatten AG-UI history to user/assistant answer
// text. Tool rows are dropped.
// -----
export function toChatMessages(payload: ChatBotWirePayload): ChatBotTurn[] {
  return payload.messages.flatMap((item) => {
    const mapped = mapMessage(item);
    return mapped ? [mapped] : [];
  });
}

export function lastUserContent(payload: ChatBotWirePayload): string | null {
  const turns = toChatMessages(payload);
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.role === "user") return turn.content;
  }
  return null;
}
