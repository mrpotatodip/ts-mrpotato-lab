import {
  ChatBotToolErrorSchema,
  type ChatBotJson,
  type ChatBotToolError,
} from "@repo/contracts/chat-bots";

// -----
// A failed call's result in structure: the
// model got { error } instead of data.
// -----
export function isChatBotToolError(value: ChatBotJson): value is ChatBotToolError {
  return ChatBotToolErrorSchema.safeParse(value).success;
}
