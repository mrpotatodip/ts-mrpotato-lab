import type { ReactNode } from "react";
import { Composer } from "./composer";
import { MessageList } from "./messages";
import type { ChatBotToolRenderers } from "./tools";
import { useChatBot, type UseChatBotOptions } from "./use-chat-bot";

export type ChatBotRoomProps = UseChatBotOptions & {
  tools?: ChatBotToolRenderers;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  // Shown under the messages while the room works, in place of the three dots (see chat-bot-react-loader).
  progress?: ReactNode;
};

// -----
// One conversation: messages and the input. Give it a
// new key to switch to another thread.
// -----
export function ChatBotRoom({ tools, placeholder, emptyText, className, progress, ...options }: ChatBotRoomProps) {
  const chat = useChatBot(options);
  return (
    <section className={className ? `cb-room ${className}` : "cb-room"}>
      <MessageList
        messages={chat.messages}
        isLoading={chat.isLoading}
        tools={tools}
        emptyText={emptyText}
        showTyping={progress === undefined}
      />
      {progress}
      {chat.error ? (
        <p className="cb-error" role="alert">
          {chat.error.message}
        </p>
      ) : null}
      <Composer onSend={(text) => void chat.send(text)} onStop={chat.stop} isLoading={chat.isLoading} placeholder={placeholder} />
    </section>
  );
}
