import type { PartProps } from "@tanstack/ai-react/ui";
import { isChatBotJsonText } from "@repo/chat-bot/chat";

import { useChatBotBubbleRole } from "../hooks/use-chat-bot-contexts";
import type { chatBotOptions } from "../api/chat-bot-options";
import { ChatBotAnswer } from "./chat-bot-answer";

export function ChatBotTextPart({
  part,
}: PartProps<typeof chatBotOptions, "text">) {
  const role = useChatBotBubbleRole();
  if (isChatBotJsonText(part.content)) return null;
  if (role === "user") return <p>{part.content}</p>;
  // -----
  // amelie-engine-api answers in plain text
  // (its subagents rule out an outputSchema).
  // -----
  return <ChatBotAnswer answer={part.content} />;
}
