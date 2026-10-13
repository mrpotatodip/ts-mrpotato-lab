import type { JSONSchema } from "@tanstack/ai";
import { Data, Effect } from "effect";
import { z } from "zod";
import {
  ChatBotJsonSchema,
  type ChatBotJson,
  type ChatBotToolError,
} from "@repo/contracts/chat-bots";
import type { ChatBotRuntime, ChatBotToolSpec } from "../lib";
import {
  CHAT_BOT_HTTP_DEFAULT_TIMEOUT_MS,
  CHAT_BOT_HTTP_MAX_RESPONSE_BYTES,
  CHAT_BOT_HTTP_PATH_BASE,
  CHAT_BOT_HTTP_PATH_PLACEHOLDER,
  CHAT_BOT_TOOL_ERROR_INVALID_INPUT,
  CHAT_BOT_TOOL_ERROR_PATH_NOT_ALLOWED,
  CHAT_BOT_TOOL_ERROR_REQUEST_FAILED,
  CHAT_BOT_TOOL_ERROR_TIMED_OUT,
  CHAT_BOT_TOOL_ERROR_TOO_LARGE,
  CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE,
} from "./constants";
import {
  ChatBotHttpEnvelopeSchema,
  ChatBotToolInputFieldsSchema,
  type ChatBotToolInputFields,
} from "./schemas";
import type { ChatBotFilledPath, ChatBotZodJsonSchema } from "./types";

class ChatBotToolFailure extends Data.TaggedError("ChatBotToolFailure")<{
  reason: string;
}> {}

// -----
// A schema zod can't read is a bad row,
// so a throw here is a defect.
// -----
function toValidator(schema: JSONSchema) {
  return Effect.sync(() =>
    // -----
    // SAFETY: both types describe the same
    // plain JSON Schema object from the row.
    // -----
    z.fromJSONSchema(schema as ChatBotZodJsonSchema),
  );
}

// -----
// Fill {{name}} from input (URL-encoded) and
// keep the fields the path did not use.
// -----
function fillPath(
  path: string,
  input: ChatBotToolInputFields,
): Effect.Effect<ChatBotFilledPath, ChatBotToolFailure> {
  const used = new Set<string>();
  let missing: string | null = null;
  const filled = path.replace(CHAT_BOT_HTTP_PATH_PLACEHOLDER, (_match, key: string) => {
    const value = input[key];
    if (value == null) {
      missing ??= key;
      return "";
    }
    used.add(key);
    return encodeURIComponent(String(value));
  });
  if (missing) return Effect.fail(new ChatBotToolFailure({ reason: `missing input: ${missing}` }));
  const rest = Object.fromEntries(Object.entries(input).filter(([key]) => !used.has(key)));
  return Effect.succeed({ path: filled, rest });
}

// -----
// Resolve against a fixed base so a row can't
// reach another host or leave the prefix.
// -----
function toAllowedUrl(path: string, prefix: string): Effect.Effect<URL, ChatBotToolFailure> {
  const url = path.startsWith("/") ? new URL(path, CHAT_BOT_HTTP_PATH_BASE) : null;
  const allowed =
    url !== null && url.origin === CHAT_BOT_HTTP_PATH_BASE && url.pathname.startsWith(prefix);
  return allowed
    ? Effect.succeed(url)
    : Effect.fail(new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_PATH_NOT_ALLOWED }));
}

// -----
// The timeout interrupts the call, which
// aborts the fetch through its signal.
// -----
function send(
  spec: ChatBotToolSpec,
  runtime: ChatBotRuntime,
  url: URL,
  body: string | undefined,
): Effect.Effect<Response, ChatBotToolFailure> {
  return Effect.tryPromise({
    try: (signal) =>
      runtime.fetch(`${url.pathname}${url.search}`, {
        method: spec.method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
        signal,
      }),
    catch: () => new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_REQUEST_FAILED }),
  }).pipe(
    Effect.timeoutFail({
      duration: spec.timeoutMs ?? CHAT_BOT_HTTP_DEFAULT_TIMEOUT_MS,
      onTimeout: () => new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_TIMED_OUT }),
    }),
  );
}

// -----
// Read the body as JSON, refusing anything
// over the size cap.
// -----
function readJson(response: Response): Effect.Effect<ChatBotJson, ChatBotToolFailure> {
  return Effect.gen(function* () {
    const tooLarge = new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_TOO_LARGE });
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > CHAT_BOT_HTTP_MAX_RESPONSE_BYTES) return yield* tooLarge;
    const text = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: () => new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_REQUEST_FAILED }),
    });
    if (new TextEncoder().encode(text).length > CHAT_BOT_HTTP_MAX_RESPONSE_BYTES) {
      return yield* tooLarge;
    }
    return yield* Effect.try({
      try: () => ChatBotJsonSchema.parse(JSON.parse(text)),
      catch: () => new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE }),
    });
  });
}

// -----
// Unwrap { data, error }; any other body
// is the result as it is.
// -----
function unwrapEnvelope(body: ChatBotJson): Effect.Effect<ChatBotJson, ChatBotToolFailure> {
  const envelope = ChatBotHttpEnvelopeSchema.safeParse(body);
  if (!envelope.success) return Effect.succeed(body);
  if (envelope.data.error) {
    return Effect.fail(new ChatBotToolFailure({ reason: envelope.data.error.message }));
  }
  return Effect.succeed(envelope.data.data);
}

// -----
// Hold the result to the row's result schema
// when it has one.
// -----
function checkResult(
  spec: ChatBotToolSpec,
  result: ChatBotJson,
): Effect.Effect<ChatBotJson, ChatBotToolFailure> {
  return Effect.gen(function* () {
    if (!spec.resultSchema) return result;
    const validator = yield* toValidator(spec.resultSchema);
    const checked = validator.safeParse(result);
    const json = ChatBotJsonSchema.safeParse(checked.data);
    if (!checked.success || !json.success) {
      return yield* new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_UNEXPECTED_RESPONSE });
    }
    return json.data;
  });
}

// -----
// One call: validate, fill the path, stay under
// the prefix, add userId, time out, cap size.
// -----
function callChatBotHttpTool(
  spec: ChatBotToolSpec,
  input: ChatBotJson,
  runtime: ChatBotRuntime,
): Effect.Effect<ChatBotJson, ChatBotToolFailure> {
  return Effect.gen(function* () {
    const validator = yield* toValidator(spec.inputSchema);
    const parsed = validator.safeParse(input);
    if (!parsed.success) {
      return yield* new ChatBotToolFailure({ reason: CHAT_BOT_TOOL_ERROR_INVALID_INPUT });
    }
    const fields = ChatBotToolInputFieldsSchema.safeParse(parsed.data).data ?? {};
    const filled = yield* fillPath(spec.path, fields);
    const url = yield* toAllowedUrl(filled.path, runtime.allowedPathPrefix);

    // -----
    // userId is set last, so the model's
    // input can never override it.
    // -----
    let body: string | undefined;
    if (spec.method === "GET") {
      for (const [key, value] of Object.entries(filled.rest)) {
        if (value != null) url.searchParams.set(key, String(value));
      }
    } else {
      body = JSON.stringify(filled.rest);
    }
    url.searchParams.set("userId", runtime.userId);

    const response = yield* send(spec, runtime, url, body);
    const result = yield* readJson(response).pipe(Effect.flatMap(unwrapEnvelope));
    if (!response.ok) {
      return yield* new ChatBotToolFailure({ reason: `endpoint returned ${response.status}` });
    }
    return yield* checkResult(spec, result);
  });
}

// -----
// Every expected failure becomes { error } so
// the model can say the data didn't load.
// -----
export function executeChatBotHttpTool(
  spec: ChatBotToolSpec,
  input: ChatBotJson,
  runtime: ChatBotRuntime,
): Effect.Effect<ChatBotJson | ChatBotToolError> {
  return callChatBotHttpTool(spec, input, runtime).pipe(
    Effect.catchTag("ChatBotToolFailure", (failure) => Effect.succeed({ error: failure.reason })),
  );
}
