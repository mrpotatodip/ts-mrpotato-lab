import { toolDefinition } from "@tanstack/ai";
import { createChatBotToolFactory, type ChatBotAgent } from "@repo/chat-bot-api";
import { z } from "zod";

// -----
// What the host hands every tool. The engine
// spreads it onto the runtime next to the owner
// and the thread. Amelie's would be { db }.
// -----
export type Services = { now: () => Date };

export const defineTool = createChatBotToolFactory<Services>();

const currentTimeTool = defineTool({
  definition: toolDefinition({
    name: "currentTime",
    description: "Get the current date and time (UTC, ISO 8601).",
    inputSchema: z.object({}),
    outputSchema: z.object({ iso: z.string() }),
  }),
  run: (_input, runtime) => ({ iso: runtime.now().toISOString() }),
});

const whoAmITool = defineTool({
  definition: toolDefinition({
    name: "whoAmI",
    description: "Say which user and workspace this chat belongs to.",
    inputSchema: z.object({}),
    outputSchema: z.object({ kind: z.string(), scopeId: z.string() }),
  }),
  run: (_input, runtime) => ({ kind: runtime.owner.kind, scopeId: runtime.owner.scopeId }),
});

// -----
// An agent is plain data: a model, prompts, tools
// and optional subagents.
// -----
export const mainAgent: ChatBotAgent<Services> = {
  id: "main",
  name: "main",
  description: "A small assistant with two tools.",
  model: "gpt-4o-mini",
  temperature: null,
  prompts: ["You are a brief, friendly assistant. Use a tool when it can answer."],
  tools: [currentTimeTool, whoAmITool],
  subagents: [],
};
