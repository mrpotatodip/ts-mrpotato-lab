import {
  CHAT_BOT_DEFAULT_MODEL,
  CHAT_BOT_SCHEDULE_AGENT_ID,
} from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import { CHAT_BOT_GUARD_RAIL_PROMPT } from "#/modules/chat-bot/agents/shared";
import { getOpeningScheduleTool, setThreadCountryTool, setThreadLocationTool } from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_SCHEDULE_PERSONA_PROMPT } from "./prompts";

// -----
// Jev routes by description: it says which
// questions belong here.
// -----
export const chatBotScheduleAgent: ChatBotAgent = {
  id: CHAT_BOT_SCHEDULE_AGENT_ID,
  name: "schedule",
  description:
    "Answers questions about the cafe's opening hours: whether it is open " +
    "now, the hours on a given day or date, the weekly hours, and special " +
    "dates such as holidays or closures.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_SCHEDULE_PERSONA_PROMPT, CHAT_BOT_GUARD_RAIL_PROMPT],
  tools: [getOpeningScheduleTool, setThreadLocationTool, setThreadCountryTool],
  subagents: [],
};
