import { Predicate, Schedule } from "effect";

// -----
// Threads
// -----
export const CHAT_BOT_THREAD_TITLE_WORD_LIMIT = 8;
export const CHAT_BOT_THREAD_TITLE_FALLBACK = "Chat";
export const CHAT_BOT_THREAD_NOT_FOUND = "Chat thread not found";
export const CHAT_BOT_THREAD_ID_REQUIRED = "threadId is required";

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
// Model input
// -----
export const CHAT_BOT_MODEL_MESSAGE_LIMIT = 20;

// -----
// Stream offsets
// -----
export const CHAT_BOT_STREAM_OFFSET_INVALID = "Invalid chat stream offset";
export const CHAT_BOT_STREAM_OFFSET_OTHER_RUN = "Chat stream offset belongs to another run";
export const CHAT_BOT_STREAM_RUN_ID_REQUIRED = "Chat stream runId is required";

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
// Tool errors: the model reads these and
// tells the user the data didn't load.
// -----
export const CHAT_BOT_TOOL_ERROR_INVALID_INPUT = "invalid input";
export const CHAT_BOT_TOOL_ERROR_TIMED_OUT = "timed out";
export const CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE = "unexpected response";
export const CHAT_BOT_TOOL_ERROR_FAILED = "tool failed";
export const CHAT_BOT_TOOL_ERROR_LIMIT_REACHED = "tool call limit reached for this turn";

// -----
// TanStack's text when a child said nothing.
// -----
export const CHAT_BOT_EMPTY_HANDOFF = "Subagent finished.";

export const CHAT_BOT_SPECIALIST_PREFIX = "Specialist result for this turn:\n";
