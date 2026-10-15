// -----
// Threads: the trigger/module a request falls
// back to, and the title's length cap.
// -----
export const CHAT_BOT_DEFAULT_TRIGGER = "chat";
export const CHAT_BOT_DEFAULT_MODULE = "chat";
export const CHAT_BOT_THREAD_TITLE_MAX = 120;

// -----
// Lookup ids are lowercase slugs, e.g. "chat".
// -----
export const CHAT_BOT_LOOKUP_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

// -----
// Runs: TanStack's run id rules (non-empty,
// no CR/LF), capped for the primary key.
// -----
export const CHAT_BOT_RUN_ID_MAX = 128;
export const CHAT_BOT_RUN_ID_PATTERN = /^[^\r\n]+$/;

// -----
// Response header that names the thread a
// rejoined stream belongs to.
// -----
export const CHAT_BOT_THREAD_ID_HEADER = "X-Thread-Id";

// -----
// AG-UI CUSTOM event the backend sends after
// each tool call so live cards match reloads.
// -----
export const CHAT_BOT_TOOL_DISPLAY_EVENT = "chat-bot.tool-display";
