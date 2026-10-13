import { CHAT_BOT_DEFAULT_MODEL, CHAT_BOT_MENU_AGENT_ID } from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import { CHAT_BOT_GUARD_RAIL_PROMPT } from "#/modules/chat-bot/agents/shared";
import {
  findMenuItemsTool,
  listMenuTool,
  setThreadCountryTool,
  setThreadLocationTool,
  showMenuItemsTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_MENU_PERSONA_PROMPT } from "./prompts";

// -----
// Public: read-only menu tools, safe for a
// Customer's widget.
// -----
export const chatBotMenuAgent: ChatBotAgent = {
  id: CHAT_BOT_MENU_AGENT_ID,
  name: "menu",
  description:
    "Answers questions about the cafe's menu: what it serves, prices and " +
    "sizes, what is available, and dietary options such as vegan or " +
    "gluten-free. Not for opening hours, contact details or other policies.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_MENU_PERSONA_PROMPT, CHAT_BOT_GUARD_RAIL_PROMPT],
  tools: [listMenuTool, findMenuItemsTool, showMenuItemsTool, setThreadLocationTool, setThreadCountryTool],
  subagents: [],
};
