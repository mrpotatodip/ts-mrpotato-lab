import type { z } from "zod";
import type { Effect, Ref } from "effect";
import type {
  AgentLoopStrategy,
  AnyChatMiddleware,
  chat,
  DebugOption,
  StreamChunk,
  StreamDurability,
  subagentRoute,
  ToolDefinitionInstance,
} from "@tanstack/ai";
import type { createOpenaiChat } from "@tanstack/ai-openai";
import type { createTypesafeDecider } from "@tanstack/ai-typesafe";
import type {
  ChatBotJson,
  ChatBotStreamBody,
  ChatBotStructure,
  ChatBotToolDisplayConfig,
  ChatBotToolError,
  ChatBotTurn,
} from "@repo/contracts/chat-bots";
import type { ChatBotDurableStreamInit } from "@repo/chat-bot-durable-stream";
import type { DbConnectType } from "#/lib/db-connection";
import type { Conflict, DbError, Invalid, NotFound } from "#/lib/effect-query";
import type { PublicTenant } from "#/modules/tenant";
import type { Bindings } from "#/types/variables";
import type { chatBotStreamQueries } from "#/modules/chat-bot/queries";
import type { ChatBotHydrateMessage } from "#/modules/chat-bot/schemas";

// -----
// Agents and tools (code-owned config)
// -----
export type ChatBotModel = Parameters<typeof createOpenaiChat>[0];

export type ChatBotToolDefinition = Pick<ToolDefinitionInstance, "name" | "description"> & {
  inputSchema: z.ZodType;
  outputSchema: z.ZodType | undefined;
};

export type ChatBotToolConfig<TInput extends z.ZodType, TOutput extends z.ZodType> = Partial<
  ChatBotToolDisplayConfig
> & {
  definition: ChatBotToolDefinition & { inputSchema: TInput; outputSchema: TOutput };
  run: (
    input: z.output<TInput>,
    runtime: ChatBotRuntime,
  ) => z.input<TOutput> | Promise<z.input<TOutput>>;
  timeoutMs?: number;
};

export type ChatBotToolSpec = ChatBotToolDisplayConfig & {
  definition: ChatBotToolDefinition;
  execute: (
    input: ChatBotJson,
    runtime: ChatBotRuntime,
  ) => Effect.Effect<ChatBotJson | ChatBotToolError>;
};

export type ChatBotAgent = {
  id: string;
  name: string;
  description: string;
  model: ChatBotModel;
  temperature: number | null;
  prompts: ReadonlyArray<string>;
  tools: ReadonlyArray<ChatBotToolSpec>;
  subagents: ReadonlyArray<ChatBotAgent>;
};

// -----
// Tool execution
// -----
export type ChatBotOwner =
  | { kind: "user"; tenantId: string; userId: string }
  | { kind: "anonymous"; tenantId: string; anonymousId: string };

export type ChatBotRuntime = {
  db: DbConnectType;
  owner: ChatBotOwner;
  threadId?: string;
};

export type IgnoredLocationRef = {
  note: string;
  options: Array<{ id: string; name: string }>;
};

export type ToolLocation = {
  locationId: string | undefined;
  ignored: IgnoredLocationRef | null;
  countryLocations: Array<{ id: string; name: string }> | null;
};

export type ChatBotAnonymousOwner = Extract<ChatBotOwner, { kind: "anonymous" }>;

export type ChatBotCustomerTurn = {
  owner: ChatBotAnonymousOwner;
  agent: ChatBotAgent;
  locationId: string | null;
  countryId: string | null;
};

export type ChatBotToolBudget = Ref.Ref<number>;

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

// -----
// Turn input
// -----
export type ChatBotSubagentInput = {
  name: string;
  description: string;
  adapter: ChatBotAdapter;
  prompts: ReadonlyArray<string>;
  tools: ReadonlyArray<ChatBotToolSpec>;
  temperature?: number | null;
};

export type ChatBotSubagents = NonNullable<ChatBotChatOptions["subagents"]>;
export type ChatBotSubagent = ChatBotSubagents["agents"][number];
export type ChatBotRouter = NonNullable<ChatBotSubagents["router"]>;
export type ChatBotRouterMessage = Parameters<ChatBotRouter>[0]["messages"][number];

// -----
// Router (Jev)
// -----
export type ChatBotRouteState = {
  latest_message: string;
  recent_conversation: Array<{ role: ChatBotRouterMessage["role"]; content: string }>;
};

export type ChatBotRouteQuestions = ReturnType<typeof subagentRoute>["questions"];
export type ChatBotRouteAnswers = Parameters<ReturnType<typeof subagentRoute>["pick"]>[0];

export type ChatBotRouteDecide = (options: {
  adapter: ReturnType<typeof createTypesafeDecider>;
  state: ChatBotRouteState;
  questions: ChatBotRouteQuestions;
  abortSignal: AbortSignal;
}) => Promise<ChatBotRouteAnswers>;

export type ChatBotInput = {
  adapter: ChatBotAdapter;
  messages: Array<ChatBotTurn>;
  prompts: ReadonlyArray<string>;
  tools: ReadonlyArray<ChatBotToolSpec>;
  runtime: ChatBotRuntime;
  temperature?: number | null;
  subagents?: ReadonlyArray<ChatBotSubagentInput>;
  route?: ChatBotRouter;
  agentLoopStrategy?: AgentLoopStrategy;
  debug?: DebugOption;
};

// -----
// Stream log
// -----
export type ChatBotDurableStreams = (
  init: Pick<ChatBotDurableStreamInit, "runId" | "offset">,
) => StreamDurability;

// -----
// Stream turn
// -----
export type ChatBotEnv = Pick<
  Bindings,
  "OPENAI_API_KEY" | "TYPESAFE_API_KEY"
>;

export type ChatBotStreamQueries = typeof chatBotStreamQueries;

export type ChatBotRunner = {
  run: (input: ChatBotInput) => AsyncIterable<StreamChunk>;
  adapterFor: (model: ChatBotModel) => ChatBotAdapter;
  route: ChatBotInput["route"];
};

export type ChatBotStreamRequest = {
  db: DbConnectType;
  queries: ChatBotStreamQueries;
  runner: ChatBotRunner;
  durableStream: ChatBotDurableStreams;
  agent: ChatBotAgent;
  owner: ChatBotOwner;
  locationId?: string | null;
  countryId?: string | null;
  body: ChatBotStreamBody;
  env: ChatBotEnv;
  waitUntil: (job: Promise<void>) => void;
  request: Request;
};

export type ChatBotTurnStart = Pick<
  ChatBotStreamRequest,
  "db" | "queries" | "runner" | "durableStream" | "env" | "waitUntil" | "owner" | "agent"
> & {
  runId: string;
  threadId: string;
  messages: Array<ChatBotTurn>;
};

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

export type StreamChatBotError = DbError | NotFound | Invalid | Conflict;

export type PublicChatLimiter = (key: string) => Promise<boolean>;

export type PublicChatLimiters = {
  message: PublicChatLimiter;
  newThread: PublicChatLimiter;
};

export type PublicChatTurnGuard = {
  db: DbConnectType;
  tenant: PublicTenant;
  owner: ChatBotAnonymousOwner;
  threadId: string | undefined;
  ip: string;
  limiters: PublicChatLimiters;
};


export type PublicChatTurnRequest = {
  db: DbConnectType;
  slug: string;
  origin: string | undefined;
  ownOrigins: ReadonlyArray<string>;
  anonymousId: string;
  runId: string | undefined;
  threadId: string | undefined;
  location?: string;
  country?: string;
  ip: string;
  limiters: PublicChatLimiters;
};

export type ChatBotPlaceInput = {
  threadId?: string;
  location?: string;
  country?: string;
};

export type ChatBotPlace = {
  locationId: string | null;
  countryId: string | null;
};

export type TopicFaq = {
  id: string;
  question: string;
  answer: string;
  countryId: string | null;
  locationId: string | null;
};

export type FaqTopicResult<T> = { faqs: T[]; note: string | null };
