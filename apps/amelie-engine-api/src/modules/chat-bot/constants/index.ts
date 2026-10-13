import { Predicate, Schedule } from "effect";

// -----
// Threads
// -----
export const CHAT_BOT_THREAD_LIST_LIMIT = 50;
export const CHAT_BOT_THREAD_TITLE_WORD_LIMIT = 8;
export const CHAT_BOT_THREAD_TITLE_FALLBACK = "Chat";
export const CHAT_BOT_THREAD_NOT_FOUND = "Chat thread not found";
export const CHAT_BOT_NO_THREAD_FOR_LOCATION = "This chat has no thread to remember a location on";
export const CHAT_BOT_NO_THREAD_FOR_COUNTRY = "This chat has no thread to remember a country on";
export const CHAT_BOT_THREAD_ID_REQUIRED = "threadId is required";
export const CHAT_BOT_TRIGGER_UNKNOWN = "Unknown chat trigger";
export const CHAT_BOT_MODULE_UNKNOWN = "Unknown chat module";
export const CHAT_BOT_LOOKUP_UNKNOWN = "Unknown chat trigger or module";

// -----
// Anonymous threads: idle expiry slides on
// each message, up to the hard cap.
// -----
export const CHAT_BOT_ANONYMOUS_IDLE_MS = 30 * 60 * 1000;
export const CHAT_BOT_ANONYMOUS_HARD_CAP_MS = 24 * 60 * 60 * 1000;

// -----
// Runs
// -----
export const CHAT_BOT_RUN_NOT_FOUND = "Chat run not found";
export const CHAT_BOT_RUN_EXISTS = "Chat run already exists";
export const CHAT_BOT_RUN_FAILED = "Chat run failed";
export const CHAT_BOT_RUN_SETUP_RETRY = {
  schedule: Schedule.exponential("100 millis"),
  times: 2,
  while: Predicate.isTagged("DbError"),
};

// -----
// Agents: config is in agents/; these ids
// are the only list of agents there is.
// -----
export const CHAT_BOT_MAIN_AGENT_ID = "main_cf08ce09-fb40-44c1-95d4-4863f6d688f3";
export const CHAT_BOT_CUSTOMER_AGENT_ID = "customer_6c1f2b0e-4d7a-4b8e-9f3a-2e5d8c7b1a90";
export const CHAT_BOT_SCHEDULE_AGENT_ID = "schedule_f1142c06-0fa0-4d5b-a4e9-fab41f517d84";
export const CHAT_BOT_SCHEDULE_ADMIN_AGENT_ID = "schedule_admin_390ae8e4-c405-4d9b-9179-b77e54914f28";
export const CHAT_BOT_FAQ_ADMIN_AGENT_ID = "faq_admin_6fa8fdc5-bda3-4a83-80ca-11c661a5430a";
export const CHAT_BOT_FAQ_AGENT_ID = "faq_66b76b7e-da42-4817-a0bb-7bb7d3a3d515";
export const CHAT_BOT_MENU_ADMIN_AGENT_ID = "menu_admin_47d091a7-8e2b-4a1f-b6bc-464939798c69";
export const CHAT_BOT_MENU_AGENT_ID = "menu_c7d1a019-c83d-43f1-a15b-e471f7fc4eb9";
export const CHAT_BOT_CUSTOMER_MODEL = "gpt-6-luna";
export const CHAT_BOT_CUSTOMER_TRIGGER = "widget";
export const CHAT_BOT_CUSTOMER_MODULE = "customer";
export const CHAT_BOT_DEFAULT_MODEL = "gpt-4o-mini";

// -----
// Model input
// -----
export const CHAT_BOT_MODEL_MESSAGE_LIMIT = 20;

// -----
// Stream log: this module's runs share
// the package tables under this prefix.
// -----
export const CHAT_BOT_STREAM_PREFIX = "chat-bot";
export const CHAT_BOT_STREAM_CHUNK_RETAIN_MS = 10 * 60 * 1000;

// -----
// Stream offsets
// -----
export const CHAT_BOT_STREAM_OFFSET_INVALID = "Invalid chat stream offset";
export const CHAT_BOT_STREAM_OFFSET_OTHER_RUN = "Chat stream offset belongs to another run";
export const CHAT_BOT_STREAM_RUN_ID_REQUIRED = "Chat stream runId is required";

// -----
// Router (Jev)
// -----
export const CHAT_BOT_ROUTE_MODEL = "jev-latest";
export const CHAT_BOT_ROUTE_TIMEOUT_MS = 4000;
export const CHAT_BOT_ROUTE_CONTEXT_TURNS = 6;

// -----
// Router: the "no child fits" answer, so
// main handles the turn alone.
// -----
export const CHAT_BOT_MAIN_ROUTE = "main";

// -----
// Tool calls
// -----
export const CHAT_BOT_TOOL_DEFAULT_TIMEOUT_MS = 5000;

// -----
// Tool budget: one per turn, shared by
// main and the child it hands off to.
// -----
export const CHAT_BOT_MAX_TOOL_CALLS_PER_TURN = 5;

// -----
// Items one change tool may touch in a call, so
// a bulk request costs one call from the budget.
// -----
export const CHAT_BOT_MAX_BATCH_ITEMS = 10;

// -----
// Tool errors: the model reads these and
// tells the user the data didn't load.
// -----
export const CHAT_BOT_TOOL_ERROR_INVALID_INPUT = "invalid input";
export const CHAT_BOT_TOOL_ERROR_TIMED_OUT = "timed out";
export const CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE = "unexpected response";
export const CHAT_BOT_TOOL_ERROR_FAILED = "tool failed";
export const CHAT_BOT_TOOL_ERROR_LIMIT_REACHED = "tool call limit reached for this turn";

// -----
// Admin tools: who may change a Tenant's
// data from chat, and what the model hears.
// -----
export const CHAT_BOT_EDITOR_ONLY = "Only a Tenant owner or manager can change this";

// -----
// Public chat limits. The per-minute ones
// live on the rate-limit bindings instead.
// -----
export const CHAT_BOT_PUBLIC_BODY_MAX_BYTES = 4 * 1024;
export const CHAT_BOT_PUBLIC_THREAD_MESSAGE_LIMIT = 30;
export const CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT = 1000;

export const CHAT_BOT_PUBLIC_RATE_LIMITED = "RATE_LIMITED";
export const CHAT_BOT_PUBLIC_THREAD_LIMIT = "THREAD_LIMIT";
export const CHAT_BOT_PUBLIC_TENANT_DAILY_LIMIT = "TENANT_DAILY_LIMIT";

export const CHAT_BOT_PUBLIC_RATE_LIMITED_MESSAGE = "You're sending messages quickly. Try again in a moment.";
export const CHAT_BOT_PUBLIC_THREAD_LIMIT_MESSAGE = "This chat is getting long. Start a new one?";
export const CHAT_BOT_PUBLIC_ORIGIN_NOT_ALLOWED = "This website can't use this chat";

// -----
// TanStack's text when a child said nothing.
// -----
export const CHAT_BOT_EMPTY_HANDOFF = "Subagent finished.";

export const CHAT_BOT_SPECIALIST_PREFIX = "Specialist result for this turn:\n";

// -----
// Tenant-wide answers while no Location is known
// -----
export const CHAT_BOT_MENU_TENANT_WIDE_NOTE =
  "No location is set, so this is the cafe-wide menu: it lists items sold at every location and items sold at only some. Say that availability can differ by location, and ask which location if it matters.";
export const CHAT_BOT_FAQS_TENANT_WIDE_NOTE =
  "No location is set, so only FAQs that apply to every location are listed. Some locations may have their own; ask which location if the answer depends on it.";

export const CHAT_BOT_FAQS_COUNTRY_NOTE = (country: string): string =>
  `No location is set, so these are the FAQs that apply to every location plus ${country}'s. Some locations may have their own; ask which location if the answer depends on it.`;

export const CHAT_BOT_FAQ_ALL_SCOPE = "all";

// -----
// An FAQ scope that is no open Country or active Location
// of the Tenant: nothing is written
// -----
export const CHAT_BOT_FAQ_SCOPE_NOT_FOUND = (ref: string, choices: string): string =>
  `scope "${ref}" is not one of this cafe's countries or locations, so nothing was changed. Ask which one the FAQ applies to (or all locations): ${choices}. Then call again with scope.`;

// -----
// The model named a Location that is not one of the Tenant's
// -----
export const CHAT_BOT_LOCATION_REF_IGNORED = (ref: string, names: string): string =>
  `locationId "${ref}" is not one of this cafe's locations, so it was ignored. The cafe's locations: ${names}.`;

// -----
// An embed named a Country and a Location that is not in it
// -----
export const CHAT_BOT_COUNTRY_LOCATION_MISMATCH = "That location is not in that country";

// -----
// The model named a Country that is not one of the Tenant's open ones
// -----
export const CHAT_BOT_COUNTRY_REF_IGNORED = (ref: string, names: string): string =>
  `countryId "${ref}" is not one of this cafe's countries, so it was ignored. The cafe's countries: ${names}.`;

// -----
// Several Countries and none in play: no prices
// -----
export const CHAT_BOT_MENU_ASK_LOCATION_NOTE =
  "This cafe sells in several countries and none is set, so prices are left out. Ask which location the customer is at before quoting a price or a currency, then call setThreadLocation or setThreadCountry (or pass countryId) and read the menu again. Names and availability are fine to share now.";

// -----
// A price write with several Countries and none named,
// or one that matches none: nothing changes
// -----
export const CHAT_BOT_PRICE_ASK_COUNTRY = (names: string): string =>
  `This cafe sells in several countries, so nothing was changed. Ask which country's price to change: ${names}. Then call updateMenuItemPrice again with countryId.`;
export const CHAT_BOT_PRICE_COUNTRY_NOT_FOUND = (ref: string, names: string): string =>
  `countryId "${ref}" is not one of this cafe's countries, so nothing was changed. Ask which country's price to change: ${names}. Then call updateMenuItemPrice again with countryId.`;
