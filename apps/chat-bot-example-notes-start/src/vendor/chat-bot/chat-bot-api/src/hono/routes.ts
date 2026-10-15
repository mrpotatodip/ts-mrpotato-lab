import { Hono, type Context, type Env, type MiddlewareHandler } from "hono";
import { describeRoute, validator } from "hono-openapi";
import type { Effect } from "effect";
import type { z } from "zod";
import {
  ChatBotStreamRequestSchema,
  ChatBotStreamQuerySchema,
  ChatBotThreadParamSchema,
  ChatBotThreadsQuerySchema,
  ChatBotTitleBodySchema,
} from "../contracts";
import type { ChatBot } from "../create-chat-bot";
import { ChatBotStreamHeaderSchema } from "../schemas";
import type {
  ChatBotAgent,
  ChatBotOwner,
  ChatBotServices,
  ChatBotThreadAttrs,
  StreamChatBotError,
} from "../types";

export type ChatBotRouteName =
  | "listThreads"
  | "getThread"
  | "renameThread"
  | "deleteThread"
  | "hydrateOrJoin"
  | "stream";

// -----
// What a host plugs in:
//   chat     the chat bot for this request (it holds
//            the request's db client)
//   owner    who is calling, from the host's own auth
//   agent    which agent answers a POSTed message
//   run      the host's run point: runs the Effect and
//            throws its own HTTP errors
//   invalid  throws the host's 400 for a bad request
//   attrs    opaque thread attributes the store gets
//            when a POST starts a thread
//   docs     richer OpenAPI docs per route; a missing
//            one gets a one-line summary
// -----
export type ChatBotRoutesConfig<E extends Env, S extends ChatBotServices> = {
  chat: (c: Context<E>) => ChatBot<S>;
  owner: (c: Context<E>) => ChatBotOwner;
  agent: (c: Context<E>) => ChatBotAgent<S>;
  run: <A>(effect: Effect.Effect<A, StreamChatBotError>) => Promise<A>;
  invalid: (message: string) => never;
  attrs?: (c: Context<E>) => ChatBotThreadAttrs | undefined;
  docs?: Partial<Record<ChatBotRouteName, MiddlewareHandler>>;
};

type IssuePath = ReadonlyArray<PropertyKey | { key: PropertyKey }> | undefined;

const issuePath = (path: IssuePath): string =>
  (path ?? []).map((segment) => String(segment instanceof Object ? segment.key : segment)).join(".");

// -----
// useChat names the thread in the URL, not the body.
// -----
const withQueryThread = <B extends { threadId?: string }>(body: B, threadId: string | undefined): B =>
  body.threadId === undefined && threadId !== undefined ? { ...body, threadId } : body;

const DEFAULT_SUMMARIES = {
  listThreads: "List the caller's chat threads",
  getThread: "Get one chat thread with its messages",
  renameThread: "Rename a chat thread",
  deleteThread: "Delete a chat thread",
  hydrateOrJoin: "Hydrate a thread, or rejoin a live run's stream",
  stream: "Send a message and stream the answer",
} satisfies Record<ChatBotRouteName, string>;

// -----
// The signed-in chat routes as one Hono app:
//   GET    /threads        GET /threads/:id
//   PATCH  /threads/:id    DELETE /threads/:id
//   GET    /               (hydrate, or rejoin a run)
//   POST   /               (send a message, stream)
// The host mounts it behind its own auth and
// keeps its own envelope: failures come back
// through `run`, bad input through `invalid`.
// -----
export function createChatBotRoutes<E extends Env, S extends ChatBotServices>(
  config: ChatBotRoutesConfig<E, S>,
): Hono<E> {
  const app = new Hono<E>();
  // -----
  // SAFETY: the validators only narrow the
  // request's input types; the env the host's
  // callbacks read is still E.
  // -----
  // oxlint-disable-next-line no-explicit-any
  const host = (c: Context<any, any, any>): Context<E> => c as Context<E>;
  const doc = (name: ChatBotRouteName): MiddlewareHandler =>
    config.docs?.[name] ??
    describeRoute({ tags: ["chat-bot"], summary: DEFAULT_SUMMARIES[name] });

  const valid = <Target extends "query" | "param" | "json" | "header", T extends z.ZodType>(
    target: Target,
    schema: T,
  ) =>
    validator(target, schema, (result) => {
      if (result.success) return;
      const message = result.error
        .map((issue) => `${issuePath(issue.path) || target}: ${issue.message}`)
        .join("; ");
      config.invalid(message);
    });

  app.get("/threads", doc("listThreads"), valid("query", ChatBotThreadsQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const data = await config.run(config.chat(host(c)).threads.list(config.owner(host(c)), query));
    return c.json({ data, error: null });
  });

  app.get("/threads/:id", doc("getThread"), valid("param", ChatBotThreadParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const data = await config.run(config.chat(host(c)).threads.get(config.owner(host(c)), id));
    return c.json({ data, error: null });
  });

  app.patch(
    "/threads/:id",
    doc("renameThread"),
    valid("param", ChatBotThreadParamSchema),
    valid("json", ChatBotTitleBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { title } = c.req.valid("json");
      const data = await config.run(config.chat(host(c)).threads.rename(config.owner(host(c)), id, title));
      return c.json({ data, error: null });
    },
  );

  app.delete("/threads/:id", doc("deleteThread"), valid("param", ChatBotThreadParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const data = await config.run(config.chat(host(c)).threads.remove(config.owner(host(c)), id));
    return c.json({ data, error: null });
  });

  app.get(
    "/",
    doc("hydrateOrJoin"),
    valid("query", ChatBotStreamQuerySchema),
    valid("header", ChatBotStreamHeaderSchema),
    (c) => {
      const { threadId } = c.req.valid("query");
      return config.run(
        config.chat(host(c)).hydrateOrJoin({ owner: config.owner(host(c)), threadId, request: c.req.raw }),
      );
    },
  );

  app.post(
    "/",
    doc("stream"),
    valid("query", ChatBotStreamQuerySchema),
    valid("header", ChatBotStreamHeaderSchema),
    valid("json", ChatBotStreamRequestSchema),
    (c) =>
      config.run(
        config.chat(host(c)).stream({
          agent: config.agent(host(c)),
          owner: config.owner(host(c)),
          body: withQueryThread(c.req.valid("json"), c.req.valid("query").threadId),
          request: c.req.raw,
          attrs: config.attrs?.(host(c)),
        }),
      ),
  );

  return app;
}
