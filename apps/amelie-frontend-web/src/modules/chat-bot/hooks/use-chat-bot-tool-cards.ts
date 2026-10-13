import { useContext, useSyncExternalStore } from "react";
import type { UIMessage } from "@tanstack/ai-client";
import { isChatBotToolError } from "@repo/chat-bot/tools";
import type { ChatBotToolDisplayEventValue } from "@repo/contracts/chat-bots";

import { ChatBotSurfaceContext } from "../contexts";
import { chatBotToolDisplayStore } from "../stores";
import type { ChatBotCard } from "../types";
import {
  cardsFromLiveEvents,
  cardsFromStructure,
  chatBotToolCallIds,
  readChatBotMessageMetadata,
} from "../utils";

export function useChatBotToolDisplays(): ReadonlyMap<string, ChatBotToolDisplayEventValue> {
  return useSyncExternalStore(
    chatBotToolDisplayStore.subscribe,
    chatBotToolDisplayStore.get,
    chatBotToolDisplayStore.get,
  );
}

// -----
// Saved structure after a reload, live
// display events while it streams.
// -----
export function useChatBotMessageCards(message: UIMessage): ChatBotCard[] {
  const live = useChatBotToolDisplays();
  const { cardTools, showFailedCards } = useContext(ChatBotSurfaceContext);
  const saved = readChatBotMessageMetadata(message.metadata);
  const cards = saved
    ? cardsFromStructure(saved.chatBot.structure)
    : cardsFromLiveEvents(chatBotToolCallIds(message.parts), live);
  return cards.filter(
    (card) =>
      (!cardTools || cardTools.has(card.tool)) && (showFailedCards || !isChatBotToolError(card.result)),
  );
}
