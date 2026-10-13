import { CHAT_BOT_DEFAULT_MODEL, CHAT_BOT_MENU_ADMIN_AGENT_ID } from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import {
  CHAT_BOT_CONFIRM_CHANGE_PROMPT,
  CHAT_BOT_GUARD_RAIL_PROMPT,
} from "#/modules/chat-bot/agents/shared";
import {
  addMenuCategoryTool,
  findMenuItemsTool,
  listMenuTool,
  setMenuItemAvailabilityTool,
  setMenuItemsAvailabilityTool,
  updateMenuItemPriceTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_MENU_ADMIN_PERSONA_PROMPT } from "./prompts";

// -----
// Signed-in only: it lists admin/ tools, so
// no Customer-facing agent may include it.
// -----
export const chatBotMenuAdminAgent: ChatBotAgent = {
  id: CHAT_BOT_MENU_ADMIN_AGENT_ID,
  name: "menu_admin",
  description:
    "Reads and changes the cafe's menu: questions about items, prices and " +
    "dietary tags, adding a category, marking one or several items sold out " +
    "or back on, and changing a price. Also handles a confirmation such as " +
    "\"yes\" to a proposed menu change. Not for adding a menu item.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_MENU_ADMIN_PERSONA_PROMPT, CHAT_BOT_CONFIRM_CHANGE_PROMPT, CHAT_BOT_GUARD_RAIL_PROMPT],
  tools: [
    listMenuTool,
    findMenuItemsTool,
    addMenuCategoryTool,
    setMenuItemAvailabilityTool,
    setMenuItemsAvailabilityTool,
    updateMenuItemPriceTool,
  ],
  subagents: [],
};
