import type { UIMessage } from "@tanstack/ai-client";
import type { ChatBotMessage, ChatBotOutput } from "@repo/contracts/chat-bots";
import type { ChatBotMessageMetadata } from "../schemas";

// -----
// Replay stored turns as UIMessages. Cards ride
// on metadata.chatBot, from the saved structure.
// -----
export function toUiMessages(rows: ChatBotMessage[]): Array<UIMessage> {
  return rows.map((row) => {
    if (row.role !== "assistant") {
      return {
        id: row.id,
        role: row.role,
        parts: [{ type: "text" as const, content: row.content }],
      };
    }

    const output: ChatBotOutput = { answer: row.content };
    const metadata: ChatBotMessageMetadata = {
      chatBot: { toolsUsed: row.toolsUsed, structure: row.structure ?? {} },
    };
    return {
      id: row.id,
      role: "assistant" as const,
      parts: [
        {
          type: "structured-output" as const,
          status: "complete" as const,
          data: output,
          raw: JSON.stringify(output),
        },
      ],
      metadata,
    };
  });
}
