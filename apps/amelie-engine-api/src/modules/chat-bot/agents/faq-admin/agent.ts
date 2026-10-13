import { CHAT_BOT_DEFAULT_MODEL, CHAT_BOT_FAQ_ADMIN_AGENT_ID } from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import {
  CHAT_BOT_CONFIRM_CHANGE_PROMPT,
  CHAT_BOT_GUARD_RAIL_PROMPT,
} from "#/modules/chat-bot/agents/shared";
import {
  addFaqTool,
  getBusinessProfileTool,
  listFaqsTool,
  updateBusinessProfileTool,
  updateFaqTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_FAQ_ADMIN_PERSONA_PROMPT } from "./prompts";

// -----
// Signed-in only: it lists admin/ tools, so
// no Customer-facing agent may include it.
// -----
export const chatBotFaqAdminAgent: ChatBotAgent = {
  id: CHAT_BOT_FAQ_ADMIN_AGENT_ID,
  name: "faq_admin",
  description:
    "Reads and changes the cafe's FAQs and contact details: questions about " +
    "them, drafting or adding an FAQ, changing an FAQ's wording, and " +
    "changing the address, phone, email, website or description. Also " +
    "handles a confirmation such as \"yes\" to a proposed FAQ or profile " +
    "change.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_FAQ_ADMIN_PERSONA_PROMPT, CHAT_BOT_CONFIRM_CHANGE_PROMPT, CHAT_BOT_GUARD_RAIL_PROMPT],
  tools: [listFaqsTool, getBusinessProfileTool, addFaqTool, updateFaqTool, updateBusinessProfileTool],
  subagents: [],
};
