import { EventType } from "@tanstack/ai";
import type { AGUILoadingStackedEvent } from "#/components/agui-loading";
import { PUBLIC_CHAT_MESSAGE_MAX_LENGTH } from "@repo/contracts/amelie";
import type { ChatBotStepLabel, ChatBotSurface } from "../types";

export const CHAT_BOT_PENDING_REPLY_KEY = "chat-bot:pending-reply";

export const CHAT_BOT_TOGGLE_HOTKEY = "Mod+.";
export const CHAT_BOT_CLOSE_HOTKEY = "Escape";

export const CHAT_BOT_STRUCTURED_OUTPUT_START = "structured-output.start";

export const CHAT_BOT_TURN_STARTED: AGUILoadingStackedEvent = {
  type: EventType.RUN_STARTED,
  runId: "turn",
};

export const CHAT_BOT_PINNED_THRESHOLD_PX = 200;

export const CHAT_BOT_REVEAL_MIN_CHARS_PER_SECOND = 30;

export const CHAT_BOT_REVEAL_CATCH_UP_PER_CHAR = 5;

export const PUBLIC_CHAT_ANONYMOUS_ID_KEY = "amelie:anonymous-id";
export const PUBLIC_CHAT_THREAD_KEY_PREFIX = "amelie:public-chat-thread:";

export const PUBLIC_CHAT_THREAD_NOT_FOUND_STATUS = 404;
export const PUBLIC_CHAT_BAD_REQUEST_STATUS = 400;

export const CHAT_BOT_STAFF_SURFACE: ChatBotSurface = {
  placeholder: "Ask about your cafe…",
  emptyPrompt: "Ask about your cafe's hours, menu or FAQs to get started.",
  maxMessageLength: undefined,
  cardTools: null,
  showFailedCards: true,
};

// -----
// A Customer sees the answer and working dish
// cards only; the steps say what happened.
// -----
export const CHAT_BOT_CUSTOMER_SURFACE: ChatBotSurface = {
  placeholder: "Ask us anything…",
  emptyPrompt: "Ask about our opening hours, menu or anything else.",
  maxMessageLength: PUBLIC_CHAT_MESSAGE_MAX_LENGTH,
  cardTools: new Set(["showMenuItems"]),
  showFailedCards: false,
};

// -----
// What a step is called on screen, by helper
// or tool name; unknown names fall back.
// -----
export const CHAT_BOT_STEP_LABELS = new Map<string, ChatBotStepLabel>([
  ["schedule", { busy: "Checking the opening hours", done: "Checked the opening hours" }],
  ["schedule_admin", { busy: "Checking the opening hours", done: "Checked the opening hours" }],
  ["menu", { busy: "Looking at the menu", done: "Looked at the menu" }],
  ["menu_admin", { busy: "Looking at the menu", done: "Looked at the menu" }],
  ["faq", { busy: "Checking the FAQs", done: "Checked the FAQs" }],
  ["faq_admin", { busy: "Checking the FAQs", done: "Checked the FAQs" }],
  ["getOpeningSchedule", { busy: "Looking up the hours", done: "Looked up the hours" }],
  ["listMenu", { busy: "Reading the menu", done: "Read the menu" }],
  ["findMenuItems", { busy: "Searching the menu", done: "Searched the menu" }],
  ["showMenuItems", { busy: "Picking dishes to show", done: "Picked dishes to show" }],
  ["listFaqs", { busy: "Reading the FAQs", done: "Read the FAQs" }],
  ["listTenants", { busy: "Looking up the cafes", done: "Looked up the cafes" }],
  ["setThreadLocation", { busy: "Switching location", done: "Switched location" }],
  ["setThreadCountry", { busy: "Switching country", done: "Switched country" }],
  ["getBusinessProfile", { busy: "Looking up contact details", done: "Looked up contact details" }],
  ["reportMissingInformation", { busy: "Noting this for the cafe team", done: "Noted this for the cafe team" }],
  ["setHoursOverride", { busy: "Saving the special hours", done: "Saved the special hours" }],
  ["removeHoursOverride", { busy: "Removing the special hours", done: "Removed the special hours" }],
  ["setBusinessHours", { busy: "Updating the weekly hours", done: "Updated the weekly hours" }],
  ["setMenuItemAvailability", { busy: "Updating availability", done: "Updated availability" }],
  ["setMenuItemsAvailability", { busy: "Updating availability", done: "Updated availability" }],
  ["updateMenuItemPrice", { busy: "Updating the price", done: "Updated the price" }],
  ["addMenuCategory", { busy: "Adding a category", done: "Added a category" }],
  ["addFaq", { busy: "Adding the FAQ", done: "Added the FAQ" }],
  ["updateFaq", { busy: "Updating the FAQ", done: "Updated the FAQ" }],
  ["updateBusinessProfile", { busy: "Updating contact details", done: "Updated contact details" }],
]);

// -----
// The loader's own rows, kept light and a little
// playful. Tool and subagent rows keep plain
// labels (CHAT_BOT_STEP_LABELS).
// -----
export const CHAT_BOT_RUN_BUSY_TEXTS = ["Perking up", "Warming up", "Getting my thoughts brewing"] as const;
export const CHAT_BOT_RUN_DONE_TEXT = "Got your message";

export const CHAT_BOT_ANSWER_BUSY_TEXTS = ["Pouring out an answer", "Almost ready", "Adding the finishing touches"] as const;
export const CHAT_BOT_ANSWER_DONE_TEXT = "Answer's ready";

export const CHAT_BOT_PROSE_BUSY_TEXTS = ["Mulling it over", "Letting it simmer", "Stirring ideas around"] as const;
export const CHAT_BOT_PROSE_DONE_TEXT = "Mulled it over";

export const CHAT_BOT_STEP_LABEL_FALLBACK: ChatBotStepLabel = {
  busy: "Working on it",
  done: "Finished a step",
};
