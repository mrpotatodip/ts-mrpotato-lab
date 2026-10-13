import { createContext } from "react";
import { createChatHookContexts } from "@tanstack/ai-react/ui";

import { CHAT_BOT_STAFF_SURFACE } from "../constants";
import type { ChatBotBubbleRole, ChatBotLatestTurn, ChatBotMessageLive, ChatBotSurface } from "../types";

export const chatBotHookContexts = createChatHookContexts();

export const chatBotUiContext = {
  chatContext: chatBotHookContexts.chatContext,
  partContext: chatBotHookContexts.partContext,
  interruptContext: chatBotHookContexts.interruptContext,
};

export const ChatBotBubbleRoleContext = createContext<ChatBotBubbleRole>("user");

export const ChatBotLatestTurnContext = createContext<ChatBotLatestTurn>({
  lastUserId: undefined,
  replyIds: new Set(),
});

export const ChatBotMessageLiveContext = createContext<ChatBotMessageLive>({ live: false });

export const ChatBotSurfaceContext = createContext<ChatBotSurface>(CHAT_BOT_STAFF_SURFACE);
