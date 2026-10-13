import { useContext } from "react";

import {
  ChatBotBubbleRoleContext,
  ChatBotLatestTurnContext,
  ChatBotMessageLiveContext,
  chatBotHookContexts,
} from "../contexts";
import type { ChatBotBubbleRole, ChatBotLatestTurn, ChatBotMessageLive } from "../types";

export const useChatBotContext = chatBotHookContexts.useChatContext;

export function useChatBotBubbleRole(): ChatBotBubbleRole {
  return useContext(ChatBotBubbleRoleContext);
}

// -----
// Changes once per turn, so messages don't
// re-render on every streamed chunk.
// -----
export function useChatBotLatestTurn(): ChatBotLatestTurn {
  return useContext(ChatBotLatestTurnContext);
}

// -----
// live types the reply out; onRevealed fires
// once it is fully shown (latest reply only).
// -----
export function useChatBotMessageLive(): ChatBotMessageLive {
  return useContext(ChatBotMessageLiveContext);
}
