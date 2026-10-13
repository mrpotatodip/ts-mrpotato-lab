import type { JSONSchema } from "@tanstack/ai";
import type { Ref } from "effect";
import type { ChatBotToolDisplayConfig } from "@repo/contracts/chat-bots";

export type ChatBotToolSpec = ChatBotToolDisplayConfig & {
  id: string;
  name: string;
  description: string;
  method: "GET" | "POST";
  path: string;
  inputSchema: JSONSchema;
  resultSchema: JSONSchema | null;
  timeoutMs: number | null;
};

export type ChatBotRuntime = {
  userId: string;
  allowedPathPrefix: string;
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
};

export type ChatBotToolBudget = Ref.Ref<number>;
