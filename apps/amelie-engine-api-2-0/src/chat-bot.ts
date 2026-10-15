import { createOpenaiChat } from "@tanstack/ai-openai";
import {
  createChatBot,
  createChatBotRunner,
  type ChatBotOwner,
  type ChatBotRunner,
} from "@repo/chat-bot-api";
import { createChatBotRoutes } from "@repo/chat-bot-api/hono";
import { createMemoryChatBotStore } from "@repo/chat-bot-api/memory";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";
import { mainAgent, type Services } from "./agent";
import { HttpError, run } from "./http";

// -----
// THE WIRING. This file is all of it: what the
// engine needs from a host, and where each piece
// comes from here.
// -----

export type Bindings = { OPENAI_API_KEY: string };

type OpenaiModel = Parameters<typeof createOpenaiChat>[0];

// -----
// 1. Storage. A ChatBotStore. This one is the
// engine's in-memory store; swap it for one over
// your database (and prove it with the store
// contract) without touching anything below.
// -----
const store = createMemoryChatBotStore();

// -----
// 2. The stream log. It lets a client that lost
// its connection pick the answer up again.
// Memory here; the Postgres one is in
// @repo/chat-bot-durable-stream.
// -----
const streamLog = memoryChatBotDurableStreamStore();

// -----
// 3. The model side: how a model name becomes an
// adapter. Built per request because the key is
// a binding.
// -----
export const openaiRunner = (env: Bindings): ChatBotRunner<Services> =>
  createChatBotRunner<Services>({
    // -----
    // SAFETY: the model id comes from our own
    // agent config and is an OpenAI one.
    // -----
    adapterFor: (model) => createOpenaiChat(model as OpenaiModel, env.OPENAI_API_KEY),
  });

// -----
// 4. Who is calling. Your own auth goes here; this
// demo trusts two headers. scopeId is the unit of
// isolation: threads never cross it.
// -----
const ownerFrom = (headers: Headers): ChatBotOwner => {
  const userId = headers.get("x-user-id");
  if (!userId) throw new HttpError("Send an x-user-id header", 401);
  return { kind: "user", scopeId: headers.get("x-scope-id") ?? "demo", userId };
};

// -----
// 5. One engine per request, then the routes.
// -----
export function chatBotRoutes(runnerFor: (env: Bindings) => ChatBotRunner<Services> = openaiRunner) {
  return createChatBotRoutes<{ Bindings: Bindings }, Services>({
    chat: (c) =>
      createChatBot<Services>({
        store,
        runner: runnerFor(c.env),
        durableStream: (init) =>
          createChatBotDurableStream(streamLog, { ...init, streamPrefix: "chat-bot" }),
        services: { now: () => new Date() },
        waitUntil: (job) => c.executionCtx.waitUntil(job),
      }),
    owner: (c) => ownerFrom(c.req.raw.headers),
    agent: () => mainAgent,
    run,
    invalid: (message) => {
      throw new HttpError(message, 400);
    },
  });
}
