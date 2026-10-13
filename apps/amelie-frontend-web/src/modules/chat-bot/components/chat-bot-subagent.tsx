import type { ComponentType } from "react";

// -----
// Renders nothing: cards, loader rows and the
// main answer already show the subagent's work.
// -----
export function ChatBotSubagent() {
  return null;
}

export type ChatBotSubagentComponents = Readonly<Record<string, ComponentType>>;

// -----
// Agent names come from the database and the UI
// throws on a missing one, so any name resolves.
// -----
export const chatBotSubagentComponents = new Proxy<ChatBotSubagentComponents>(
  {},
  { get: () => ChatBotSubagent },
);
