import type { AgentLoopStrategy, chat, DebugOption, StreamChunk } from "@tanstack/ai";
import type { Effect } from "effect";
import type { ChatBotOutput, ChatBotTurn } from "@repo/contracts/chat-bots";
import type { ChatBotRuntime, ChatBotToolSpec } from "../../lib";

// -----
// chat() and its options
// -----
export type ChatBotChatOptions = Parameters<typeof chat>[0];
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

export type ChatBotRouteAgent = Pick<ChatBotSubagentInput, "name" | "description">;

export type ChatBotRouter = (ctx: {
  messages: ReadonlyArray<ChatBotTurn>;
  agents: ReadonlyArray<ChatBotRouteAgent>;
}) => Effect.Effect<string>;

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
// Parsed model output
// -----
export type ParsedChatBotJson = {
  answer: string | null;
  output: ChatBotOutput | null;
};
