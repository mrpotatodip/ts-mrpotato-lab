import type { z } from "zod";
import type { Effect, Ref } from "effect";
import type {
  AgentLoopStrategy,
  AnyChatMiddleware,
  chat,
  DebugOption,
  StreamChunk,
  StreamDurability,
  ToolDefinitionInstance,
} from "@tanstack/ai";
import type { ChatBotDurableStreamInit } from "@repo/chat-bot-durable-stream";
import type {
  ChatBotJson,
  ChatBotStreamBody,
  ChatBotStructure,
  ChatBotThreadDeleted,
  ChatBotThreadDetail,
  ChatBotThreadListItem,
  ChatBotThreadsQuery,
  ChatBotToolDisplayConfig,
  ChatBotToolError,
  ChatBotTurn,
} from "./contracts";
import type {
  ChatBotConflict,
  ChatBotDbError,
  ChatBotInvalid,
  ChatBotNotFound,
} from "./errors";
import type {
  ChatBotAssistantMessage,
  ChatBotHydrateMessage,
  ChatBotRunCloseStatus,
  ChatBotRunRefRow,
  ChatBotThreadRef,
} from "./schemas";

// -----
// Who is chatting. scopeId is the host's unit of
// isolation (a tenant, an org, a workspace): the
// engine never reads it, it only keeps threads
// apart by it.
// -----
export type ChatBotOwner =
  | { kind: "user"; scopeId: string; userId: string }
  | { kind: "anonymous"; scopeId: string; anonymousId: string };

export type ChatBotAnonymousOwner = Extract<ChatBotOwner, { kind: "anonymous" }>;

// -----
// What a tool receives: the host's own services
// (db client, mailer, ...) plus the owner and the
// thread, which the server sets, never the model.
// -----
export type ChatBotServices = object;

export type ChatBotRuntime<S extends ChatBotServices = ChatBotServices> = S & {
  owner: ChatBotOwner;
  threadId?: string;
};

export type ChatBotToolBudget = Ref.Ref<number>;

// -----
// Agents and tools (code-owned config)
// -----
export type ChatBotToolDefinition = Pick<ToolDefinitionInstance, "name" | "description"> & {
  inputSchema: z.ZodType;
  outputSchema: z.ZodType | undefined;
};

export type ChatBotToolConfig<
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
  S extends ChatBotServices = ChatBotServices,
> = Partial<ChatBotToolDisplayConfig> & {
  definition: ChatBotToolDefinition & { inputSchema: TInput; outputSchema: TOutput };
  run: (
    input: z.output<TInput>,
    runtime: ChatBotRuntime<S>,
  ) => z.input<TOutput> | Promise<z.input<TOutput>>;
  timeoutMs?: number;
};

export type ChatBotToolSpec<S extends ChatBotServices = ChatBotServices> =
  ChatBotToolDisplayConfig & {
    definition: ChatBotToolDefinition;
    execute: (
      input: ChatBotJson,
      runtime: ChatBotRuntime<S>,
    ) => Effect.Effect<ChatBotJson | ChatBotToolError>;
  };

export type ChatBotAgent<S extends ChatBotServices = ChatBotServices> = {
  id: string;
  name: string;
  description: string;
  model: string;
  temperature: number | null;
  prompts: ReadonlyArray<string>;
  tools: ReadonlyArray<ChatBotToolSpec<S>>;
  subagents: ReadonlyArray<ChatBotAgent<S>>;
};

// -----
// chat() and its options
// -----
// -----
// Left unresolved, chat()'s middleware
// generic makes the field undefined.
// -----
export type ChatBotChatOptions = Omit<Parameters<typeof chat>[0], "middleware"> & {
  middleware?: Array<AnyChatMiddleware>;
};
export type ChatBotChat = (options: ChatBotChatOptions) => AsyncIterable<StreamChunk>;
export type ChatBotAdapter = ChatBotChatOptions["adapter"];
export type ChatBotModelOptions = ChatBotChatOptions["modelOptions"];

export type ChatBotSubagents = NonNullable<ChatBotChatOptions["subagents"]>;
export type ChatBotSubagent = ChatBotSubagents["agents"][number];
export type ChatBotRouter = NonNullable<ChatBotSubagents["router"]>;
export type ChatBotRouterMessage = Parameters<ChatBotRouter>[0]["messages"][number];

// -----
// Turn input
// -----
export type ChatBotSubagentInput<S extends ChatBotServices = ChatBotServices> = {
  name: string;
  description: string;
  adapter: ChatBotAdapter;
  prompts: ReadonlyArray<string>;
  tools: ReadonlyArray<ChatBotToolSpec<S>>;
  temperature?: number | null;
};

export type ChatBotInput<S extends ChatBotServices = ChatBotServices> = {
  adapter: ChatBotAdapter;
  messages: Array<ChatBotTurn>;
  prompts: ReadonlyArray<string>;
  tools: ReadonlyArray<ChatBotToolSpec<S>>;
  runtime: ChatBotRuntime<S>;
  temperature?: number | null;
  subagents?: ReadonlyArray<ChatBotSubagentInput<S>>;
  route?: ChatBotRouter;
  agentLoopStrategy?: AgentLoopStrategy;
  debug?: DebugOption;
};

// -----
// The model side of a turn. The engine takes it
// as a value; a host builds it from its provider
// and tests stub it.
// -----
export type ChatBotRunner<S extends ChatBotServices = ChatBotServices> = {
  run: (input: ChatBotInput<S>) => AsyncIterable<StreamChunk>;
  adapterFor: (model: string) => ChatBotAdapter;
  route: ChatBotInput["route"];
};

// -----
// Stream log
// -----
export type ChatBotDurableStreams = (
  init: Pick<ChatBotDurableStreamInit, "runId" | "offset">,
) => StreamDurability;

// -----
// Storage port. Every method is already bound to
// the host's database; the engine never sees it.
// A thread belongs to an owner, and every read
// that takes an owner must not leak a stranger's
// thread (answer NotFound / null / no rows).
// -----
export type ChatBotRunRef = ChatBotRunRefRow;

export type ChatBotThreadAttrs = Readonly<Record<string, string | null>>;

export type ChatBotNewThread = {
  owner: ChatBotOwner;
  title: string;
  trigger: string;
  module: string;
  runId: string;
  attrs?: ChatBotThreadAttrs;
};

export type ChatBotStore = {
  assertThreadStart: (start: {
    trigger: string;
    module: string;
  }) => Effect.Effect<void, ChatBotDbError | ChatBotInvalid>;
  lookupRun: (
    owner: ChatBotOwner,
    runId: string,
  ) => Effect.Effect<ChatBotRunRef | null, ChatBotDbError>;
  findThread: (
    owner: ChatBotOwner,
    threadId: string,
  ) => Effect.Effect<ChatBotThreadRef, ChatBotDbError | ChatBotNotFound>;
  insertRun: (run: {
    runId: string;
    threadId: string;
  }) => Effect.Effect<void, ChatBotDbError | ChatBotConflict | ChatBotNotFound>;
  insertThreadWithRun: (
    thread: ChatBotNewThread,
  ) => Effect.Effect<{ id: string }, ChatBotDbError | ChatBotConflict | ChatBotInvalid>;
  insertUserMessage: (message: {
    threadId: string;
    scopeId: string;
    content: string;
  }) => Effect.Effect<void, ChatBotDbError>;
  insertAssistantMessage: (
    message: ChatBotAssistantMessage,
  ) => Effect.Effect<void, ChatBotDbError>;
  listMessagesForModel: (
    threadId: string,
    limit: number,
  ) => Effect.Effect<ChatBotTurn[], ChatBotDbError>;
  closeRun: (
    runId: string,
    status: ChatBotRunCloseStatus,
  ) => Effect.Effect<void, ChatBotDbError>;
  extendAnonymousThread: (threadId: string) => Effect.Effect<void, ChatBotDbError>;
  recordRunUsage: (
    runId: string,
    usage: ChatBotTurnUsage,
  ) => Effect.Effect<void, ChatBotDbError>;
  findActiveRun: (
    threadId: string,
  ) => Effect.Effect<{ id: string } | null, ChatBotDbError>;
  listThreads: (
    owner: ChatBotOwner,
    query: ChatBotThreadsQuery,
  ) => Effect.Effect<ChatBotThreadListItem[], ChatBotDbError>;
  getThread: (
    owner: ChatBotOwner,
    threadId: string,
  ) => Effect.Effect<ChatBotThreadDetail, ChatBotDbError | ChatBotNotFound>;
  renameThread: (
    owner: ChatBotOwner,
    threadId: string,
    title: string,
  ) => Effect.Effect<ChatBotThreadListItem, ChatBotDbError | ChatBotNotFound>;
  deleteThread: (
    owner: ChatBotOwner,
    threadId: string,
  ) => Effect.Effect<ChatBotThreadDeleted, ChatBotDbError | ChatBotNotFound>;
};

// -----
// Stream turn
// -----
export type ChatBotTurnUsage = {
  model: string | null;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
};

export type ChatBotCollectedTurn = {
  answer: string;
  toolsUsed: string[];
  structure: ChatBotStructure;
  usage: ChatBotTurnUsage | null;
};

export type ChatBotHydrateResult = {
  messages: ChatBotHydrateMessage[];
  activeRun: { runId: string } | null;
};

export type StreamChatBotResult = { runId: string; threadId: string; offset: string };

export type StreamChatBotError =
  | ChatBotDbError
  | ChatBotNotFound
  | ChatBotInvalid
  | ChatBotConflict;

// -----
// What a host binds once per request: its store,
// model side, stream log and services. The turn
// itself (agent, owner, body) comes per call.
// -----
export type ChatBotDeps<S extends ChatBotServices = ChatBotServices> = {
  store: ChatBotStore;
  runner: ChatBotRunner<S>;
  durableStream: ChatBotDurableStreams;
  services: S;
  waitUntil: (job: Promise<void>) => void;
  modelMessageLimit?: number;
};

export type ChatBotTurnRequest<S extends ChatBotServices = ChatBotServices> = {
  agent: ChatBotAgent<S>;
  owner: ChatBotOwner;
  body: ChatBotStreamBody;
  request: Request;
  attrs?: ChatBotThreadAttrs;
};

export type ChatBotStreamRequest<S extends ChatBotServices = ChatBotServices> = ChatBotDeps<S> &
  ChatBotTurnRequest<S>;

export type ChatBotTurnStart<S extends ChatBotServices = ChatBotServices> = Pick<
  ChatBotStreamRequest<S>,
  "store" | "runner" | "durableStream" | "services" | "waitUntil" | "owner" | "agent"
> & {
  runId: string;
  threadId: string;
  messages: Array<ChatBotTurn>;
};
