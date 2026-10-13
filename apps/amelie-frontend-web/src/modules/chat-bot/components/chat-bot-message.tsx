import type { MessageProps } from "@tanstack/ai-react/ui";
import { isChatBotJsonText } from "@repo/chat-bot/chat";

import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";
import type { chatBotOptions } from "../api/chat-bot-options";
import { ChatBotBubbleRoleContext, ChatBotMessageLiveContext } from "../contexts";
import { useChatBotLatestTurn } from "../hooks/use-chat-bot-contexts";
import { useChatBotPendingReplyThread } from "../hooks/use-chat-bot-pending-reply";
import { useChatBotRouteThreadId } from "../hooks/use-chat-bot-route-thread-id";
import { useChatBotMessageCards } from "../hooks/use-chat-bot-tool-cards";
import { clearChatBotPendingReply } from "../stores";
import { chatBotAnswerFromPart, readChatBotMessageMetadata } from "../utils";
import { ChatBotLoadingStacked } from "./chat-bot-loading-stacked";
import { ChatBotToolCards } from "./chat-bot-tool-cards";

// -----
// Cards bubble, then answer bubble, each shown
// as soon as it has content, mid-turn included.
// -----
export function ChatBotMessage({
  message,
  Parts,
}: MessageProps<typeof chatBotOptions>) {
  const align = message.role === "user" ? "end" : "start";
  const role = message.role === "user" ? "user" : "assistant";
  const cards = useChatBotMessageCards(message);
  const turn = useChatBotLatestTurn();
  const routeThreadId = useChatBotRouteThreadId();
  const pendingThreadId = useChatBotPendingReplyThread();
  const latestReply = role === "assistant" && turn.replyIds.has(message.id);
  // -----
  // A saved reply types out too when this tab
  // was waiting on it before a reload.
  // -----
  const resumed =
    latestReply && routeThreadId !== undefined && pendingThreadId === routeThreadId;
  const live = readChatBotMessageMetadata(message.metadata) == null || resumed;
  // -----
  // Answer bubble only for user text or an
  // answer that has text, plain or structured.
  // -----
  const showParts =
    role === "user" ||
    message.parts.some(
      (part) =>
        (part.type === "text" &&
          part.content.trim() !== "" &&
          !isChatBotJsonText(part.content)) ||
        (part.type === "structured-output" && Boolean(chatBotAnswerFromPart(part))),
    );

  // -----
  // The step log sits under the latest user
  // message, above this turn's reply.
  // -----
  const showLoader = role === "user" && turn.lastUserId === message.id;

  return (
    <ChatBotBubbleRoleContext.Provider value={role}>
      {role === "assistant" && cards.length > 0 ? (
        <Message align={align}>
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>
                <ChatBotToolCards cards={cards} />
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      ) : null}
      {showParts ? (
        <Message align={align}>
          <MessageContent>
            <Bubble variant={role === "user" ? "default" : "muted"}>
              <BubbleContent>
                <ChatBotMessageLiveContext.Provider
                  value={{
                    live,
                    onRevealed: latestReply ? clearChatBotPendingReply : undefined,
                  }}
                >
                  <Parts />
                </ChatBotMessageLiveContext.Provider>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      ) : null}
      {showLoader ? <ChatBotLoadingStacked /> : null}
    </ChatBotBubbleRoleContext.Provider>
  );
}
