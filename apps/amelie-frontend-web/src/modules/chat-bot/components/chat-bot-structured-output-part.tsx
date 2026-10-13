import type { PartProps } from "@tanstack/ai-react/ui";

import type { chatBotOptions } from "../api/chat-bot-options";
import { chatBotAnswerFromPart } from "../utils";
import { ChatBotAnswer } from "./chat-bot-answer";

export function ChatBotStructuredOutputPart({
  part,
}: PartProps<typeof chatBotOptions, "structuredOutput">) {
  return (
    <ChatBotAnswer answer={chatBotAnswerFromPart(part)} status={part.status} />
  );
}
