import type { StructuredOutputPart } from "@tanstack/ai";
import { z } from "zod";
import { parseChatBotJson } from "@repo/chat-bot/chat";

const ChatBotAnswerFieldSchema = z.object({ answer: z.string() });

function readAnswer(value: StructuredOutputPart["partial"]): string | null {
  const parsed = ChatBotAnswerFieldSchema.safeParse(value);
  return parsed.success ? parsed.data.answer : null;
}

// -----
// The live partial answer, then the parsed
// object, then the raw JSON as a last resort.
// -----
export function chatBotAnswerFromPart(part: StructuredOutputPart): string | null {
  return (
    readAnswer(part.partial) ??
    readAnswer(part.data) ??
    parseChatBotJson(part.raw).answer ??
    null
  );
}
