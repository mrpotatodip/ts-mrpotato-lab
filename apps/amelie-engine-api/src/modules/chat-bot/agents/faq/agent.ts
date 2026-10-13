import { CHAT_BOT_DEFAULT_MODEL, CHAT_BOT_FAQ_AGENT_ID } from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import { CHAT_BOT_GUARD_RAIL_PROMPT } from "#/modules/chat-bot/agents/shared";
import { getBusinessProfileTool, listFaqsTool } from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_FAQ_PERSONA_PROMPT } from "./prompts";

// -----
// Public: read-only FAQ and profile tools,
// safe for a Customer's widget.
// -----
export const chatBotFaqAgent: ChatBotAgent = {
  id: CHAT_BOT_FAQ_AGENT_ID,
  name: "faq",
  description:
    "Answers questions about the cafe's policies and practical details, " +
    "such as parking, kids, dogs, Wi-Fi, bookings or payment, and its " +
    "address, phone, email or website. Not for the menu or opening hours.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_FAQ_PERSONA_PROMPT, CHAT_BOT_GUARD_RAIL_PROMPT],
  tools: [listFaqsTool, getBusinessProfileTool],
  subagents: [],
};
