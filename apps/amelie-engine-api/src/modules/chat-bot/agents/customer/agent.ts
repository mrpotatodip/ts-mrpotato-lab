import {
  CHAT_BOT_CUSTOMER_AGENT_ID,
  CHAT_BOT_CUSTOMER_MODEL,
} from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import {
  findMenuItemsTool,
  getBusinessProfileTool,
  getOpeningScheduleTool,
  listFaqsTool,
  listMenuTool,
  reportMissingInformationTool,
  setThreadCountryTool,
  setThreadLocationTool,
  showMenuItemsTool,
} from "#/modules/chat-bot/agent-tools";
import { chatBotScheduleAgent } from "#/modules/chat-bot/agents/schedule";
import { chatBotMenuAgent } from "#/modules/chat-bot/agents/menu";
import { chatBotFaqAgent } from "#/modules/chat-bot/agents/faq";
import {
  CHAT_BOT_CUSTOMER_GUARD_RAIL_PROMPT,
  CHAT_BOT_CUSTOMER_PERSONA_PROMPT,
} from "./prompts";

// -----
// The public main: read-only public/ tools of
// its own, so a missed route still looks up.
// -----
export const chatBotCustomerAgent: ChatBotAgent = {
  id: CHAT_BOT_CUSTOMER_AGENT_ID,
  name: "customer",
  description: "Answers a Customer's questions about one Tenant, through its specialists.",
  model: CHAT_BOT_CUSTOMER_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_CUSTOMER_PERSONA_PROMPT, CHAT_BOT_CUSTOMER_GUARD_RAIL_PROMPT],
  tools: [
    getOpeningScheduleTool,
    findMenuItemsTool,
    listMenuTool,
    showMenuItemsTool,
    listFaqsTool,
    getBusinessProfileTool,
    reportMissingInformationTool,
    setThreadLocationTool,
    setThreadCountryTool,
  ],
  subagents: [chatBotScheduleAgent, chatBotMenuAgent, chatBotFaqAgent],
};
