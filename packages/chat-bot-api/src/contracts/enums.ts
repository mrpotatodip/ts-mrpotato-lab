// -----
// Twin of the chat_bot_tools_display_known
// CHECK in db-elise; change both together.
// -----
export const CHAT_BOT_TOOL_DISPLAY_VALUES = [
  "number",
  "key_value",
  "table",
  "list",
] as const;

export type ChatBotToolDisplayValue = (typeof CHAT_BOT_TOOL_DISPLAY_VALUES)[number];

export const CHAT_BOT_TURN_ROLE_VALUES = ["user", "assistant"] as const;

export type ChatBotTurnRoleValue = (typeof CHAT_BOT_TURN_ROLE_VALUES)[number];
