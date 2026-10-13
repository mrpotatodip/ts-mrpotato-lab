import { Data, Effect } from "effect";
import type { z } from "zod";
import {
  ChatBotJsonSchema,
  type ChatBotJson,
  type ChatBotToolError,
} from "@repo/contracts/chat-bots";
import { AppError } from "#/lib/errors";
import {
  CHAT_BOT_TOOL_DEFAULT_TIMEOUT_MS,
  CHAT_BOT_TOOL_ERROR_FAILED,
  CHAT_BOT_TOOL_ERROR_INVALID_INPUT,
  CHAT_BOT_TOOL_ERROR_TIMED_OUT,
  CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE,
} from "#/modules/chat-bot/constants";
import type {
  ChatBotRuntime,
  ChatBotToolConfig,
  ChatBotToolSpec,
} from "#/modules/chat-bot/types";

class ChatBotToolFailure extends Data.TaggedError("ChatBotToolFailure")<{
  reason: string;
  issues?: Array<{ path: string; code: string }>;
}> {}

// -----
// A 4xx AppError's message is safe for the
// model; anything else is logged, not shown.
// -----
function toToolFailure(name: string, cause: unknown): ChatBotToolFailure {
  if (cause instanceof AppError && cause.statusCode < 500) {
    return new ChatBotToolFailure({ reason: cause.message });
  }
  console.error("chat-bot: tool failed", name, cause);
  return new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_FAILED });
}

// -----
// One call: check input, run the function
// under a timeout, check the result.
// -----
function callChatBotTool<TInput extends z.ZodType, TOutput extends z.ZodType>(
  config: ChatBotToolConfig<TInput, TOutput>,
  input: ChatBotJson,
  runtime: ChatBotRuntime,
): Effect.Effect<ChatBotJson, ChatBotToolFailure> {
  const { definition, run, timeoutMs } = config;
  return Effect.gen(function* () {
    const parsed = definition.inputSchema.safeParse(input);
    if (!parsed.success) {
      return yield* new ChatBotToolFailure({
        reason: CHAT_BOT_TOOL_ERROR_INVALID_INPUT,
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
      });
    }
    const result = yield* Effect.tryPromise({
      try: async () => run(parsed.data, runtime),
      catch: (cause) => toToolFailure(definition.name, cause),
    }).pipe(
      Effect.timeoutFail({
        duration: timeoutMs ?? CHAT_BOT_TOOL_DEFAULT_TIMEOUT_MS,
        onTimeout: () => new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_TIMED_OUT }),
      }),
    );
    const checked = definition.outputSchema.safeParse(result);
    const json = ChatBotJsonSchema.safeParse(checked.data);
    if (!checked.success || !json.success) {
      return yield* new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE });
    }
    return json.data;
  });
}

// -----
// A failure the model is told about but the
// server did not log yet. Paths and codes only:
// the values are the customer's.
// -----
function logToolRejection(name: string, runtime: ChatBotRuntime, failure: ChatBotToolFailure) {
  if (failure.reason === CHAT_BOT_TOOL_ERROR_FAILED) return;
  console.error("chat-bot: tool call rejected", {
    tool: name,
    threadId: runtime.threadId ?? null,
    error: failure.reason,
    issues: failure.issues ?? [],
  });
}

// -----
// run gets input typed from the schema; every
// expected failure becomes { error } for the model.
// -----
export function defineChatBotTool<TInput extends z.ZodType, TOutput extends z.ZodType>(
  config: ChatBotToolConfig<TInput, TOutput>,
): ChatBotToolSpec {
  return {
    definition: config.definition,
    display: config.display ?? null,
    displayOptions: config.displayOptions ?? null,
    execute: (input, runtime): Effect.Effect<ChatBotJson | ChatBotToolError> =>
      callChatBotTool(config, input, runtime).pipe(
        Effect.catchTag("ChatBotToolFailure", (failure) => {
          logToolRejection(config.definition.name, runtime, failure);
          return Effect.succeed({ error: failure.reason });
        }),
      ),
  };
}
