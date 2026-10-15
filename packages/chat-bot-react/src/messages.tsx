import type { UIMessage } from "@tanstack/ai-react";
import { useEffect, useRef } from "react";
import { ToolCard, toolCallsOf, type ChatBotToolRenderers } from "./tools";

const textOf = (message: UIMessage): string =>
  message.parts.map((part) => (part.type === "text" ? part.content : "")).join("");

export type MessageListProps = {
  messages: UIMessage[];
  isLoading?: boolean;
  tools?: ChatBotToolRenderers;
  emptyText?: string;
  // The three-dot mark while an answer has not started. Default true.
  showTyping?: boolean;
};

// -----
// The conversation. It follows the newest message, and
// shows a typing mark while an answer has not started.
// -----
export function MessageList({ messages, isLoading, tools, emptyText, showTyping = true }: MessageListProps) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" });
  }, [messages, isLoading]);

  const last = messages.at(-1);
  const waiting = showTyping && isLoading && (last === undefined || last.role === "user" || textOf(last) === "");

  return (
    <div className="cb-messages" role="log" aria-live="polite" aria-label="Conversation">
      {messages.length === 0 && !isLoading ? <p className="cb-empty">{emptyText ?? "Ask me anything."}</p> : null}
      {messages.map((message) => {
        const text = textOf(message);
        const calls = message.role === "assistant" ? toolCallsOf(message) : [];
        if (text === "" && calls.length === 0) return null;
        return (
          <div key={message.id} className={`cb-message cb-message--${message.role}`}>
            <span className="cb-role">{message.role === "user" ? "You" : "Assistant"}</span>
            {text === "" ? null : <p className="cb-text">{text}</p>}
            {calls.map((call, index) => (
              <ToolCard key={`${call.name}-${index}`} call={call} renderers={tools} />
            ))}
          </div>
        );
      })}
      {waiting ? (
        <div className="cb-message cb-message--assistant" aria-label="Assistant is typing">
          <span className="cb-typing" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : null}
      <div ref={end} />
    </div>
  );
}
