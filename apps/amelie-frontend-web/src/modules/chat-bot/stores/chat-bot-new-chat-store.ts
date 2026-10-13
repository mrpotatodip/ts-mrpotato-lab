import { clearCreatedThreadId, peekCreatedThreadId, setChatBotStreamThreadId } from "./chat-bot-stream-thread-store";
import { createChatBotStore } from "./create-chat-bot-store";

// -----
// Counts the new chats that follow a chat made
// in place, so the composer can use it as a key.
// -----
export const chatBotNewChatStore = createChatBotStore(() => 0);

// -----
// Back on the empty room. If the last chat was
// created here (its id is held), the composer would
// keep that chat's messages, so the count moves on.
// -----
export function startChatBotNewChat(): void {
  const hadCreatedChat = peekCreatedThreadId() !== undefined;
  clearCreatedThreadId();
  setChatBotStreamThreadId(undefined);
  if (hadCreatedChat) chatBotNewChatStore.set(chatBotNewChatStore.get() + 1);
}
