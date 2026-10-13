import { z } from "zod";
import { ChatBotStructureSchema, type ChatBotStructure } from "@repo/contracts/chat-bots";
import { UNANSWERED_QUESTION_TOOL } from "#/modules/unanswered-question/constants";

const MissingTopicResultSchema = z.object({ topic: z.string() });

// -----
// A reply's saved structure, read from the database.
// One that does not fit shows no topic.
// -----
export const parseReplyStructure = (row: { structure: unknown }): ChatBotStructure | null =>
  ChatBotStructureSchema.nullable().catch(null).parse(row.structure);

// -----
// The topics sit in the reply's saved tool results.
// -----
export const toMissingTopics = (structure: ChatBotStructure | null): string[] => {
  const results = structure?.[UNANSWERED_QUESTION_TOOL]?.results ?? [];
  const topics = results.flatMap((result) => {
    const parsed = MissingTopicResultSchema.safeParse(result);
    return parsed.success ? [parsed.data.topic] : [];
  });
  return [...new Set(topics)];
};
