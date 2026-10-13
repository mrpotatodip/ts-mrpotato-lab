import { decide, subagentRoute, type SubagentRouterPick, type TextPart } from "@tanstack/ai";
import { createTypesafeDecider } from "@tanstack/ai-typesafe";
import { Effect } from "effect";
import { ExternalError, runEffect } from "#/lib/effect-query";
import {
  CHAT_BOT_MAIN_ROUTE,
  CHAT_BOT_ROUTE_CONTEXT_TURNS,
  CHAT_BOT_ROUTE_MODEL,
  CHAT_BOT_ROUTE_TIMEOUT_MS,
} from "#/modules/chat-bot/constants";
import type {
  ChatBotRouteDecide,
  ChatBotRouter,
  ChatBotRouterMessage,
  ChatBotRouteState,
} from "#/modules/chat-bot/types";

const isTextPart = (part: { type: string }): part is TextPart => part.type === "text";

function joinTextParts(parts: ReadonlyArray<{ type: string }>): string {
  return parts
    .filter(isTextPart)
    .map((part) => part.content)
    .join("");
}

// -----
// A UI message carries text parts; a model
// message carries a string, parts or null.
// -----
function toChatBotRouteText(message: ChatBotRouterMessage): string {
  if ("parts" in message) return joinTextParts(message.parts);
  if (Array.isArray(message.content)) return joinTextParts(message.content);
  return message.content ?? "";
}

// -----
// Earlier turns give a follow-up like
// "and add 4 to that" its meaning.
// -----
export function toChatBotRouteState(
  messages: ReadonlyArray<ChatBotRouterMessage>,
): ChatBotRouteState | null {
  const latestIndex = messages.findLastIndex((message) => message.role === "user");
  const latest = messages[latestIndex];
  if (!latest) return null;
  return {
    latest_message: toChatBotRouteText(latest),
    recent_conversation: messages
      .slice(Math.max(0, latestIndex - CHAT_BOT_ROUTE_CONTEXT_TURNS), latestIndex)
      .map((message) => ({ role: message.role, content: toChatBotRouteText(message) })),
  };
}

const toExternalError = (cause: unknown) => new ExternalError({ cause });

// -----
// One routing call. Every step that can throw
// is an ExternalError; a timeout aborts Jev.
// -----
function routeChatBotTurnEffect(
  apiKey: string,
  decideRoute: ChatBotRouteDecide,
  ctx: Parameters<ChatBotRouter>[0],
): Effect.Effect<SubagentRouterPick, ExternalError> {
  return Effect.gen(function* () {
    const state = toChatBotRouteState(ctx.messages);
    if (!state) return CHAT_BOT_MAIN_ROUTE;
    const route = yield* Effect.try({ try: () => subagentRoute(ctx.agents), catch: toExternalError });
    const adapter = yield* Effect.try({
      try: () => createTypesafeDecider(CHAT_BOT_ROUTE_MODEL, apiKey),
      catch: toExternalError,
    });
    const answers = yield* Effect.tryPromise({
      try: (signal) =>
        decideRoute({
          adapter,
          state,
          questions: route.questions,
          abortSignal: ctx.abortSignal ? AbortSignal.any([signal, ctx.abortSignal]) : signal,
        }),
      catch: toExternalError,
    }).pipe(
      Effect.timeoutFail({
        duration: CHAT_BOT_ROUTE_TIMEOUT_MS,
        onTimeout: () => toExternalError(new Error("Jev routing timed out")),
      }),
    );
    return yield* Effect.try({ try: () => route.pick(answers), catch: toExternalError });
  });
}

// -----
// Jev picks the children; any failure,
// a timeout included, falls back to main.
// -----
export function createChatBotJevRouter(
  apiKey: string,
  decideRoute: ChatBotRouteDecide = decide,
): ChatBotRouter {
  return (ctx) =>
    runEffect(
      routeChatBotTurnEffect(apiKey, decideRoute, ctx).pipe(
        Effect.tap((pick) => Effect.sync(() => console.info("chat-bot: route", pick))),
        Effect.catchTag("ExternalError", (error) =>
          Effect.sync(() => {
            console.warn("chat-bot: routing failed, using main", error.cause);
            return CHAT_BOT_MAIN_ROUTE;
          }),
        ),
      ),
    );
}
