import type { ChatBotMessage } from "../contracts";
import type { ChatBotHydrateMessage } from "../schemas";

// -----
// Stored turns as useChat's hydrate payload;
// cards ride on metadata.chatBot.
// -----
export function toChatBotUiMessages(rows: ChatBotMessage[]): Array<ChatBotHydrateMessage> {
  return rows.map((row) => {
    if (row.role !== "assistant") {
      return { id: row.id, role: row.role, parts: [{ type: "text", content: row.content }] };
    }
    return {
      id: row.id,
      role: "assistant",
      parts: [{ type: "text", content: row.content }],
      metadata: {
        chatBot: { toolsUsed: row.toolsUsed, structure: row.structure ?? {} },
      },
    };
  });
}
