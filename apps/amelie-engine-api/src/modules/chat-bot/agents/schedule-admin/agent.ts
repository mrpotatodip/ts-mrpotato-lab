import {
  CHAT_BOT_DEFAULT_MODEL,
  CHAT_BOT_SCHEDULE_ADMIN_AGENT_ID,
} from "#/modules/chat-bot/constants";
import type { ChatBotAgent } from "#/modules/chat-bot/types";
import {
  CHAT_BOT_CONFIRM_CHANGE_PROMPT,
  CHAT_BOT_GUARD_RAIL_PROMPT,
} from "#/modules/chat-bot/agents/shared";
import {
  getOpeningScheduleTool,
  removeHoursOverrideTool,
  setBusinessHoursTool,
  setHoursOverrideTool,
  setThreadLocationTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_SCHEDULE_ADMIN_PERSONA_PROMPT } from "./prompts";

// -----
// Signed-in only: it lists admin/ tools, so
// no Customer-facing agent may include it.
// -----
export const chatBotScheduleAdminAgent: ChatBotAgent = {
  id: CHAT_BOT_SCHEDULE_ADMIN_AGENT_ID,
  name: "schedule_admin",
  description:
    "Changes the cafe's opening hours: special hours or a closure on one " +
    "date, removing a date's special hours, or a weekday's regular hours. " +
    "Also handles a confirmation such as \"yes\" to a proposed hours change. " +
    "Not for questions about the current hours.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [
    CHAT_BOT_SCHEDULE_ADMIN_PERSONA_PROMPT,
    CHAT_BOT_CONFIRM_CHANGE_PROMPT,
    CHAT_BOT_GUARD_RAIL_PROMPT,
  ],
  tools: [
    getOpeningScheduleTool,
    setThreadLocationTool,
    setHoursOverrideTool,
    removeHoursOverrideTool,
    setBusinessHoursTool,
  ],
  subagents: [],
};
