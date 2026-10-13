import { EventType, type StreamChunk } from "@tanstack/ai";

import { CHAT_BOT_PENDING_REPLY_KEY } from "../constants";
import { ChatBotToolTurnMetadataSchema } from "../schemas";
import { createChatBotStore } from "./create-chat-bot-store";

// -----
// Storage can throw (private mode, blocked
// site data); then nothing is pending.
// -----
function readStored(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(CHAT_BOT_PENDING_REPLY_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStored(threadId: string | null): void {
  try {
    if (threadId) globalThis.sessionStorage?.setItem(CHAT_BOT_PENDING_REPLY_KEY, threadId);
    else globalThis.sessionStorage?.removeItem(CHAT_BOT_PENDING_REPLY_KEY);
  } catch {
    // -----
    // Unsaved: a reload then shows the
    // reply in full, as it did before.
    // -----
  }
}

// -----
// The thread this tab is waiting on a reply
// for; it outlives a page reload.
// -----
export const chatBotPendingReplyStore = createChatBotStore(readStored);

function setPending(threadId: string | null): void {
  if (threadId === chatBotPendingReplyStore.get()) return;
  writeStored(threadId);
  chatBotPendingReplyStore.set(threadId);
}

export function markChatBotPendingReply(threadId: string): void {
  setPending(threadId);
}

export function clearChatBotPendingReply(): void {
  setPending(null);
}

// -----
// A tool turn's RUN_FINISHED: the run goes on
// with the tool results.
// -----
function isToolTurnEnd(chunk: StreamChunk): boolean {
  if ("finishReason" in chunk && chunk.finishReason !== undefined) {
    return chunk.finishReason === "tool_calls";
  }
  return ChatBotToolTurnMetadataSchema.safeParse(chunk.metadata).success;
}

// -----
// An ended run isn't pending, shown or not;
// else a reload types it out again.
// -----
export function clearChatBotPendingReplyOnRunEnd(chunk: StreamChunk): void {
  if (chunk.type === EventType.RUN_ERROR) setPending(null);
  if (chunk.type === EventType.RUN_FINISHED && !isToolTurnEnd(chunk)) setPending(null);
}
