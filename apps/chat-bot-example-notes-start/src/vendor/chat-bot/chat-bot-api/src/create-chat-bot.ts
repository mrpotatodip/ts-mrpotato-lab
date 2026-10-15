import type { Effect } from "effect";
import type {
  ChatBotThreadDeleted,
  ChatBotThreadDetail,
  ChatBotThreadListItem,
  ChatBotThreadsQuery,
} from "./contracts";
import type { ChatBotDbError, ChatBotInvalid, ChatBotNotFound } from "./errors";
import { hydrateChatBotSvc, hydrateOrJoinChatBotSvc } from "./services/hydrate";
import { joinChatBotSseSvc } from "./services/resume";
import { startChatBotRunSvc, streamChatBotSvc } from "./services/stream";
import type {
  ChatBotDeps,
  ChatBotHydrateResult,
  ChatBotOwner,
  ChatBotServices,
  ChatBotTurnRequest,
  StreamChatBotError,
  StreamChatBotResult,
} from "./types";

// -----
// stream is the POST: start the run (or find it)
// and answer with its SSE stream. start is the
// same without the response, for a host that
// builds its own. hydrateOrJoin is the GET: an
// offset rejoins a live run, otherwise it is the
// hydrate.
// -----
export type ChatBot<S extends ChatBotServices = ChatBotServices> = {
  stream: (turn: ChatBotTurnRequest<S>) => Effect.Effect<Response, StreamChatBotError>;
  start: (turn: ChatBotTurnRequest<S>) => Effect.Effect<StreamChatBotResult, StreamChatBotError>;
  hydrateOrJoin: (input: {
    owner: ChatBotOwner;
    threadId: string | undefined;
    request: Request;
  }) => Effect.Effect<Response, ChatBotDbError | ChatBotNotFound | ChatBotInvalid>;
  hydrate: (
    owner: ChatBotOwner,
    threadId: string,
  ) => Effect.Effect<ChatBotHydrateResult, ChatBotDbError | ChatBotNotFound>;
  join: (
    owner: ChatBotOwner,
    request: Request,
  ) => Effect.Effect<Response, ChatBotDbError | ChatBotNotFound | ChatBotInvalid>;
  threads: {
    list: (
      owner: ChatBotOwner,
      query?: ChatBotThreadsQuery,
    ) => Effect.Effect<ChatBotThreadListItem[], ChatBotDbError>;
    get: (
      owner: ChatBotOwner,
      threadId: string,
    ) => Effect.Effect<ChatBotThreadDetail, ChatBotDbError | ChatBotNotFound>;
    rename: (
      owner: ChatBotOwner,
      threadId: string,
      title: string,
    ) => Effect.Effect<ChatBotThreadListItem, ChatBotDbError | ChatBotNotFound>;
    remove: (
      owner: ChatBotOwner,
      threadId: string,
    ) => Effect.Effect<ChatBotThreadDeleted, ChatBotDbError | ChatBotNotFound>;
  };
};

// -----
// The one entry point. A host binds its store,
// model side, stream log and services (usually
// once per request, since the db client is) and
// gets every chat-bot operation back as an
// Effect it can run and map to HTTP itself.
// -----
export function createChatBot<S extends ChatBotServices = ChatBotServices>(
  deps: ChatBotDeps<S>,
): ChatBot<S> {
  const { store, durableStream } = deps;
  return {
    stream: (turn) => streamChatBotSvc({ ...deps, ...turn }),
    start: (turn) => startChatBotRunSvc({ ...deps, ...turn }),
    hydrateOrJoin: ({ owner, threadId, request }) =>
      hydrateOrJoinChatBotSvc(store, durableStream, owner, threadId, request),
    hydrate: (owner, threadId) => hydrateChatBotSvc(store, owner, threadId),
    join: (owner, request) => joinChatBotSseSvc(store, durableStream, owner, request),
    threads: {
      list: (owner, query = {}) => store.listThreads(owner, query),
      get: (owner, threadId) => store.getThread(owner, threadId),
      rename: (owner, threadId, title) => store.renameThread(owner, threadId, title),
      remove: (owner, threadId) => store.deleteThread(owner, threadId),
    },
  };
}
