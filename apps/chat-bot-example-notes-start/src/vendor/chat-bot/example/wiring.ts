import { toolDefinition } from "@tanstack/ai";
import { Cause, Effect, Exit, Option } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import {
  createChatBot,
  createChatBotRunner,
  createChatBotToolFactory,
  type ChatBotAdapter,
  type ChatBotAgent,
  type ChatBotOwner,
  type StreamChatBotError,
} from "@repo/chat-bot-api";
import { createChatBotRoutes } from "@repo/chat-bot-api/hono";
import { createMemoryChatBotStore } from "@repo/chat-bot-api/memory";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";

// -----
// THE WIRING, in one file. Everything a host gives the
// engine is here; delete what you don't need and replace
// what you do. Nothing in this file is about any product.
// -----

// 1. What your tools receive next to `owner` and `threadId`.
//    Put your db client, mailer, and so on here.
export type Services = { now: () => Date };

// 2. Tools and agents are plain data.
export const defineChatBotTool = createChatBotToolFactory<Services>();

const currentTimeTool = defineChatBotTool({
  definition: toolDefinition({
    name: "currentTime",
    description: "Get the current date and time (UTC, ISO 8601).",
    inputSchema: z.object({}),
    outputSchema: z.object({ iso: z.string() }),
  }),
  run: (_input, runtime) => ({ iso: runtime.now().toISOString() }),
});

export const DEFAULT_PROMPTS = ["You are a brief, friendly assistant."];

export const exampleAgent = (model: string, prompts: string[] = DEFAULT_PROMPTS): ChatBotAgent<Services> => ({
  id: "main",
  name: "main",
  description: "A small assistant.",
  model,
  temperature: null,
  prompts,
  tools: [currentTimeTool],
  subagents: [],
});

// 3. The engine's failures are tagged. You decide the HTTP shape.
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 404 | 409 | 500,
  ) {
    super(message);
  }
}

const STATUS = { Invalid: 400, NotFound: 404, Conflict: 409, DbError: 500 } as const satisfies Record<
  StreamChatBotError["_tag"],
  HttpError["status"]
>;

async function run<A>(effect: Effect.Effect<A, StreamChatBotError>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.failureOption(exit.cause);
  if (Option.isNone(failure) || failure.value._tag === "DbError") {
    throw new HttpError("Internal server error", 500);
  }
  throw new HttpError(failure.value.message, STATUS[failure.value._tag]);
}

export type ExampleConfig = {
  // How a model name becomes an adapter (and where the API key goes).
  adapterFor: (model: string) => ChatBotAdapter;
  model: string;
  // The system prompt: one string per block, sent in this order. The engine adds its own tool
  // rules after yours (see README). Default: DEFAULT_PROMPTS.
  prompts?: string[];
  // Or build the whole agent yourself: your own tools, subagents, or a prompt per customer
  // (read your customer from the request). Wins over `prompts` and `model`.
  agent?: (request: Request) => ChatBotAgent<Services>;
  // Where the routes are served. Match your server route: "/api/chat" for src/routes/api/chat.$.ts. Default "/chat".
  basePath?: string;
  // Who is calling. `scopeId` is your unit of isolation (tenant, org, workspace).
  ownerFrom: (request: Request) => ChatBotOwner;
  // Keeps the answer running after the response closes. On Node: (job) => void job.catch(console.error)
  waitUntil: (job: Promise<unknown>) => void;
};

export function createExampleApp(config: ExampleConfig) {
  // 4. Storage and the stream log. Memory here; see the README for Postgres.
  const store = createMemoryChatBotStore();
  const streamLog = memoryChatBotDurableStreamStore();
  const defaultAgent = exampleAgent(config.model, config.prompts);
  const runner = createChatBotRunner<Services>({ adapterFor: config.adapterFor });

  // 5. One engine per request, then the routes.
  const app = new Hono();
  app.route(
    config.basePath ?? "/chat",
    createChatBotRoutes<Record<string, never>, Services>({
      chat: () =>
        createChatBot<Services>({
          store,
          runner,
          durableStream: (init) =>
            createChatBotDurableStream(streamLog, { ...init, streamPrefix: "chat-bot" }),
          services: { now: () => new Date() },
          waitUntil: (job) => config.waitUntil(job),
        }),
      // The route hands the owner callback a Hono context; read your auth from its request.
      owner: (c) => config.ownerFrom(c.req.raw),
      agent: (c) => config.agent?.(c.req.raw) ?? defaultAgent,
      run,
      invalid: (message) => {
        throw new HttpError(message, 400);
      },
    }),
  );
  app.onError((error, c) =>
    error instanceof HttpError
      ? c.json({ data: null, error: { message: error.message } }, error.status)
      : c.json({ data: null, error: { message: "Internal server error" } }, 500),
  );
  return app;
}
