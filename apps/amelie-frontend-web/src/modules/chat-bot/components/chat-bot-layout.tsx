import { useContext } from "react";
import type { LayoutProps } from "@tanstack/ai-react/ui";

import type { chatBotOptions } from "../api/chat-bot-options";
import { ChatBotLatestTurnContext, ChatBotSurfaceContext } from "../contexts";
import { useChatBotContext } from "../hooks/use-chat-bot-contexts";
import { useChatBotStickToBottom } from "../hooks/use-chat-bot-stick-to-bottom";
import { useChatBotTurnFromMessages } from "../hooks/use-chat-bot-turn-from-messages";

export function ChatBotLayout({
  Messages,
  Input,
}: LayoutProps<typeof chatBotOptions>) {
  const chat = useChatBotContext();
  const surface = useContext(ChatBotSurfaceContext);
  const empty = chat.messages.length === 0;
  const sentCount = chat.messages.filter((message) => message.role === "user").length;
  const { scrollRef, contentRef } = useChatBotStickToBottom(sentCount, !empty);
  const turn = useChatBotTurnFromMessages(chat.messages);

  // -----
  // Centered column, full-width scroller so
  // the wheel works anywhere on the page.
  // -----
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {empty ? (
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col justify-center overflow-hidden">
          <p className="px-4 text-center text-sm text-muted-foreground">
            {surface.emptyPrompt}
          </p>
          {chat.error ? (
            <p className="px-4 text-center text-sm text-destructive">
              {chat.error.message}
            </p>
          ) : null}
          <Input />
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
          >
            <div ref={contentRef} className="mx-auto flex w-full max-w-2xl flex-col gap-8 pb-16">
              <ChatBotLatestTurnContext.Provider value={turn}>
                <Messages />
              </ChatBotLatestTurnContext.Provider>
              {chat.error ? (
                <p className="text-sm text-destructive">{chat.error.message}</p>
              ) : null}
            </div>
          </div>
          <div className="mx-auto w-full max-w-2xl shrink-0 pb-12 lg:pb-0">
            <Input />
          </div>
        </>
      )}
    </div>
  );
}
