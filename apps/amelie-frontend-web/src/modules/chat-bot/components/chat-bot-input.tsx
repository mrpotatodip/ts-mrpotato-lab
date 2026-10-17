import { useContext, useRef } from "react";
import { Send, Square } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";
import { PowerMark } from "#/modules/shared";
import { useChatBotContext } from "../hooks/use-chat-bot-contexts";
import { ChatBotSurfaceContext } from "../contexts";
import { startChatBotStreamTurn } from "../stores";

export function ChatBotInput() {
  const chat = useChatBotContext();
  const surface = useContext(ChatBotSurfaceContext);
  const pending = chat.isLoading;
  const fieldRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="p-4"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        const field = fieldRef.current;
        if (!field) return;
        const text = field.value.trim();
        if (!text || pending) return;
        field.value = "";
        startChatBotStreamTurn();
        void chat.sendMessage(text);
      }}
    >
      <Message>
        <MessageContent>
          <Bubble variant="outline" className="w-full max-w-full">
            <BubbleContent className="flex w-full items-center gap-1 py-1 pr-1">
              <Input
                ref={fieldRef}
                autoComplete="off"
                placeholder={surface.placeholder}
                maxLength={surface.maxMessageLength}
                disabled={pending}
                className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {surface.sendPower ? <PowerMark power={surface.sendPower} /> : null}
              {pending ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Stop"
                  onClick={() => chat.stop()}
                >
                  <Square />
                </Button>
              ) : (
                <Button type="submit" size="icon-sm" variant="ghost" aria-label="Send">
                  <Send />
                </Button>
              )}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </form>
  );
}
