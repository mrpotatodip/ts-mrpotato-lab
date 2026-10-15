import { Data, Effect } from "effect";
import type { z } from "zod";
import {
  ChatBotJsonSchema,
  type ChatBotJson,
  type ChatBotToolError,
} from "../contracts";
import {
  CHAT_BOT_TOOL_DEFAULT_TIMEOUT_MS,
  CHAT_BOT_TOOL_ERROR_FAILED,
  CHAT_BOT_TOOL_ERROR_INVALID_INPUT,
  CHAT_BOT_TOOL_ERROR_TIMED_OUT,
  CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE,
} from "../constants";
import type {
  ChatBotRuntime,
  ChatBotServices,
  ChatBotToolConfig,
  ChatBotToolSpec,
} from "../types";

class ChatBotToolFailure extends Data.TaggedError("ChatBotToolFailure")<{
  reason: string;
  issues?: Array<{ path: string; code: string }>;
}> {}

export type ChatBotToolOptions = {
  // -----
  // The text of an error that is safe for the
  // model to read (a 4xx the host raised on
  // purpose), or undefined to hide it and say
  // only that the tool failed.
  // -----
  safeMessage?: (cause: unknown) => string | undefined;
};

function toToolFailure(
  name: string,
  cause: unknown,
  safeMessage: ChatBotToolOptions["safeMessage"],
): ChatBotToolFailure {
  const reason = safeMessage?.(cause);
  if (reason !== undefined) return new ChatBotToolFailure({ reason });
  console.error("chat-bot: tool failed", name, cause);
  return new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_FAILED });
}

// -----
// One call: check input, run the function
// under a timeout, check the result.
// -----
function callChatBotTool<
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
  S extends ChatBotServices,
>(
  config: ChatBotToolConfig<TInput, TOutput, S>,
  input: ChatBotJson,
  runtime: ChatBotRuntime<S>,
  options: ChatBotToolOptions,
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
      catch: (cause) => toToolFailure(definition.name, cause, options.safeMessage),
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
function logToolRejection(
  name: string,
  runtime: { threadId?: string },
  failure: ChatBotToolFailure,
) {
  if (failure.reason === CHAT_BOT_TOOL_ERROR_FAILED) return;
  console.error("chat-bot: tool call rejected", {
    tool: name,
    threadId: runtime.threadId ?? null,
    error: failure.reason,
    issues: failure.issues ?? [],
  });
}

// -----
// A host calls this once with its services type
// and error policy, then defines every tool with
// the result: run gets input typed from the
// schema and the host's services on the runtime;
// every expected failure becomes { error } for
// the model.
// -----
export function createChatBotToolFactory<S extends ChatBotServices = ChatBotServices>(
  options: ChatBotToolOptions = {},
) {
  return function defineChatBotTool<TInput extends z.ZodType, TOutput extends z.ZodType>(
    config: ChatBotToolConfig<TInput, TOutput, S>,
  ): ChatBotToolSpec<S> {
    return {
      definition: config.definition,
      display: config.display ?? null,
      displayOptions: config.displayOptions ?? null,
      execute: (input, runtime): Effect.Effect<ChatBotJson | ChatBotToolError> =>
        callChatBotTool(config, input, runtime, options).pipe(
          Effect.catchTag("ChatBotToolFailure", (failure) => {
            logToolRejection(config.definition.name, runtime, failure);
            return Effect.succeed({ error: failure.reason });
          }),
        ),
    };
  };
}

export const defineChatBotTool = createChatBotToolFactory();
