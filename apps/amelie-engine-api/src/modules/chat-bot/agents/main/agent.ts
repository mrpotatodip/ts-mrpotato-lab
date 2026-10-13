import {
  CHAT_BOT_DEFAULT_MODEL,
  CHAT_BOT_MAIN_AGENT_ID,
} from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import {
  findMenuItemsTool,
  getBusinessProfileTool,
  getOpeningScheduleTool,
  listFaqsTool,
  listMenuTool,
  setThreadCountryTool,
  setThreadLocationTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_GUARD_RAIL_PROMPT } from "#/modules/chat-bot/agents/shared";
import { chatBotScheduleAdminAgent } from "#/modules/chat-bot/agents/schedule-admin";
import { chatBotMenuAdminAgent } from "#/modules/chat-bot/agents/menu-admin";
import { chatBotFaqAdminAgent } from "#/modules/chat-bot/agents/faq-admin";
import { CHAT_BOT_MAIN_PERSONA_PROMPT } from "./prompts";

// -----
// The signed-in main reads cafe data itself;
// only the admin specialists change it.
// -----
export const chatBotMainAgent: ChatBotAgent = {
  id: CHAT_BOT_MAIN_AGENT_ID,
  name: "main",
  description:
    "Default chat-bot agent that helps a team member run their cafe.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_MAIN_PERSONA_PROMPT, CHAT_BOT_GUARD_RAIL_PROMPT],
  tools: [
    getOpeningScheduleTool,
    findMenuItemsTool,
    listMenuTool,
    listFaqsTool,
    getBusinessProfileTool,
    setThreadLocationTool,
    setThreadCountryTool,
  ],
  subagents: [chatBotScheduleAdminAgent, chatBotMenuAdminAgent, chatBotFaqAdminAgent],
};
