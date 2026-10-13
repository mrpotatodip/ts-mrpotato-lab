import { createOpenaiChat } from "@tanstack/ai-openai";
import { Stream } from "effect";
import { createChatBotJevRouter } from "#/modules/chat-bot/agent-router";
import type { ChatBotEnv, ChatBotRunner } from "#/modules/chat-bot/types";
import { runChatBot } from "./chat-bot-run";

// -----
// The real model side of a turn. The stream
// handler takes it as a value; tests stub it.
// -----
export function createChatBotRunner(env: ChatBotEnv): ChatBotRunner {
  return {
    // -----
    // The stream log reads chunks as an async
    // iterable; a model failure is thrown there.
    // -----
    run: (input) => Stream.toAsyncIterable(runChatBot(input)),
    adapterFor: (model) => createOpenaiChat(model, env.OPENAI_API_KEY),
    // -----
    // Jev picks the children that run before
    // main. With no key, main answers alone.
    // -----
    route: env.TYPESAFE_API_KEY ? createChatBotJevRouter(env.TYPESAFE_API_KEY) : undefined,
  };
}
