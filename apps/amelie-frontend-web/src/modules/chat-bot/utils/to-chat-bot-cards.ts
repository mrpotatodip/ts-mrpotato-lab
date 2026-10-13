import type { UIMessage } from "@tanstack/ai-client";
import type {
  ChatBotStructure,
  ChatBotToolDisplayEventValue,
} from "@repo/contracts/chat-bots";

import { ChatBotMessageMetadataSchema, type ChatBotMessageMetadata } from "../schemas";
import type { ChatBotCard } from "../types";

const parsedMetadata = new WeakMap<object, ChatBotMessageMetadata | null>();

function parseChatBotMessageMetadata(
  metadata: UIMessage["metadata"],
): ChatBotMessageMetadata | null {
  const parsed = ChatBotMessageMetadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data : null;
}

// -----
// A saved message's cards ride on its metadata.
// Cached per object: every render reads it.
// -----
export function readChatBotMessageMetadata(
  metadata: UIMessage["metadata"],
): ChatBotMessageMetadata | null {
  if (!(metadata instanceof Object)) return parseChatBotMessageMetadata(metadata);
  if (parsedMetadata.has(metadata)) return parsedMetadata.get(metadata) ?? null;
  const parsed = parseChatBotMessageMetadata(metadata);
  parsedMetadata.set(metadata, parsed);
  return parsed;
}

// -----
// Reloaded message: flatten the saved structure.
// -----
export function cardsFromStructure(structure: ChatBotStructure): ChatBotCard[] {
  return Object.entries(structure).flatMap(([tool, entry]) =>
    entry.results.map((result, index) => ({
      key: `${tool}:${index}`,
      tool,
      display: entry.display,
      displayOptions: entry.displayOptions,
      result,
    })),
  );
}

// -----
// Live message: the display events recorded for
// this message's tool calls, in part order.
// -----
export function cardsFromLiveEvents(
  toolCallIds: ReadonlyArray<string>,
  events: ReadonlyMap<string, ChatBotToolDisplayEventValue>,
): ChatBotCard[] {
  return toolCallIds.flatMap((toolCallId) => {
    const event = events.get(toolCallId);
    if (!event) return [];
    return [
      {
        key: toolCallId,
        tool: event.tool,
        display: event.display,
        displayOptions: event.displayOptions,
        result: event.result,
      },
    ];
  });
}

// -----
// Tool-call ids in call order, including
// calls nested in a subagent's messages.
// -----
export function chatBotToolCallIds(parts: UIMessage["parts"]): string[] {
  return parts.flatMap((part) => {
    if (part.type === "tool-call") return [part.id];
    if (part.type === "subagent") {
      return part.subagent.messages.flatMap((child) => chatBotToolCallIds(child.parts));
    }
    return [];
  });
}
