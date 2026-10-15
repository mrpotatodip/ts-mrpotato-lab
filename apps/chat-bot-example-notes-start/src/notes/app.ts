import { Cause, Effect, Exit, Option } from "effect";
import { Hono } from "hono";
import {
  createChatBot,
  type ChatBotOwner,
  type ChatBotRunner,
  type StreamChatBotError,
} from "@repo/chat-bot-api";
import { createChatBotRoutes } from "@repo/chat-bot-api/hono";
import { createMemoryChatBotStore } from "@repo/chat-bot-api/memory";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";
import { createNotesAgent, type Notebook, type Services } from "./notes";

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 404 | 409 | 500,
  ) {
    super(message);
  }
}

const STATUS_BY_TAG = {
  Invalid: 400,
  NotFound: 404,
  Conflict: 409,
  DbError: 500,
} as const satisfies Record<StreamChatBotError["_tag"], HttpError["status"]>;

async function run<A>(effect: Effect.Effect<A, StreamChatBotError>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.failureOption(exit.cause);
  if (Option.isNone(failure) || failure.value._tag === "DbError") {
    throw new HttpError("Internal server error", 500);
  }
  throw new HttpError(failure.value.message, STATUS_BY_TAG[failure.value._tag]);
}

// -----
// Auth is this host's business: a workspace and
// a member, from headers. The engine only sees
// the owner it is handed.
// -----
const ownerFrom = (headers: Headers): ChatBotOwner => {
  const userId = headers.get("x-member");
  const scopeId = headers.get("x-workspace");
  if (!userId || !scopeId) throw new HttpError("Send x-workspace and x-member", 401);
  return { kind: "user", scopeId, userId };
};

// -----
// The host in one function. runner is how a model
// name becomes an adapter (and holds the API key);
// model is the name the agent asks for.
// -----
export type NotesAppConfig = { runner: ChatBotRunner<Services>; model: string };

export function createNotesApp({ runner, model }: NotesAppConfig) {
  const agent = createNotesAgent(model);
  const store = createMemoryChatBotStore();
  const streamLog = memoryChatBotDurableStreamStore();
  const notebook: Notebook = new Map();

  const app = new Hono<{ Bindings: { waitUntil?: (job: Promise<unknown>) => void } }>();
  app.route(
    "/chat",
    createChatBotRoutes<{ Bindings: { waitUntil?: (job: Promise<unknown>) => void } }, Services>({
      chat: (c) =>
        createChatBot<Services>({
          store,
          runner,
          durableStream: (init) =>
            createChatBotDurableStream(streamLog, { ...init, streamPrefix: "notes" }),
          services: { notebook },
          waitUntil: (job) => c.executionCtx.waitUntil(job),
        }),
      owner: (c) => ownerFrom(c.req.raw.headers),
      agent: () => agent,
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
  return { app, notebook };
}
