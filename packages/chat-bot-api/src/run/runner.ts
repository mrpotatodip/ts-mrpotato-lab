import { Stream } from "effect";
import type { ChatBotAdapter, ChatBotInput, ChatBotRunner, ChatBotServices } from "../types";
import { runChatBot } from "./run-chat-bot";

// -----
// A host's model side: how a model name becomes
// an adapter, and the optional router that picks
// which children run before main.
// -----
export type ChatBotRunnerConfig = {
  adapterFor: (model: string) => ChatBotAdapter;
  route?: ChatBotInput["route"];
};

// -----
// The stream log reads chunks as an async
// iterable; a model failure is thrown there.
// -----
export function createChatBotRunner<S extends ChatBotServices = ChatBotServices>(
  config: ChatBotRunnerConfig,
): ChatBotRunner<S> {
  return {
    run: (input) => Stream.toAsyncIterable(runChatBot(input)),
    adapterFor: config.adapterFor,
    route: config.route,
  };
}
