// -----
// HTTP executor
// -----
export const CHAT_BOT_HTTP_DEFAULT_TIMEOUT_MS = 5000;
export const CHAT_BOT_HTTP_MAX_RESPONSE_BYTES = 256 * 1024;
export const CHAT_BOT_HTTP_PATH_PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
export const CHAT_BOT_HTTP_PATH_BASE = "http://chat-bot.local";

// -----
// Tool budget
// -----
export const CHAT_BOT_MAX_TOOL_CALLS_PER_TURN = 5;

// -----
// Tool errors: the model reads these and
// tells the user the data didn't load.
// -----
export const CHAT_BOT_TOOL_ERROR_INVALID_INPUT = "invalid input";
export const CHAT_BOT_TOOL_ERROR_PATH_NOT_ALLOWED = "path not allowed";
export const CHAT_BOT_TOOL_ERROR_TIMED_OUT = "timed out";
export const CHAT_BOT_TOOL_ERROR_REQUEST_FAILED = "request failed";
export const CHAT_BOT_TOOL_ERROR_TOO_LARGE = "response too large";
export const CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE = "unexpected response";
export const CHAT_BOT_TOOL_ERROR_FAILED = "tool failed";
export const CHAT_BOT_TOOL_ERROR_LIMIT_REACHED = "tool call limit reached for this turn";
