import type { ReactNode } from "react";
import { ChatBotStructureSchema } from "@repo/chat-bot-api/contracts";
import type { UIMessage } from "@tanstack/ai-react";

// -----
// What a tool card is handed: the tool's name, what
// the model asked it, and what came back. Each result
// is the JSON the tool returned.
// -----
export type ChatBotToolCall = {
  name: string;
  input: unknown;
  results: unknown[];
};

export type ChatBotToolRenderers = Record<string, (call: ChatBotToolCall) => ReactNode>;

const pretty = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// -----
// The default card: the tool's name, and its result as
// JSON, folded away.
// -----
function DefaultToolCard({ call }: { call: ChatBotToolCall }) {
  return (
    <details className="cb-tool">
      <summary>{call.name}</summary>
      {call.input === undefined ? null : <pre>{pretty(call.input)}</pre>}
      {call.results.map((result, index) => (
        <pre key={index}>{pretty(result)}</pre>
      ))}
    </details>
  );
}

export function ToolCard({ call, renderers }: { call: ChatBotToolCall; renderers?: ChatBotToolRenderers }) {
  const custom = renderers?.[call.name];
  return custom ? <>{custom(call)}</> : <DefaultToolCard call={call} />;
}

// -----
// Tool calls of one message, from either source: the
// live stream (tool-call parts) or a stored thread (the
// cards the engine saved on the message's metadata).
// -----
export function toolCallsOf(message: UIMessage): ChatBotToolCall[] {
  const live = message.parts.flatMap((part): ChatBotToolCall[] =>
    part.type === "tool-call"
      ? [{ name: part.name, input: part.input, results: part.output === undefined ? [] : [part.output] }]
      : [],
  );
  if (live.length > 0) return live;
  const stored = ChatBotStructureSchema.safeParse(
    (message.metadata as { chatBot?: { structure?: unknown } } | undefined)?.chatBot?.structure,
  );
  if (!stored.success) return [];
  return Object.entries(stored.data).map(([name, entry]) => ({
    name,
    input: undefined,
    results: entry.results,
  }));
}
