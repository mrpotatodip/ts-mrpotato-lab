import type { StreamChunk } from "@tanstack/ai";
import {
  CHAT_BOT_TOOL_DISPLAY_EVENT,
  type ChatBotStructure,
  type ChatBotToolDisplayEventValue,
} from "../contracts";
import {
  ChatBotRunFinishedChunkSchema,
  type ChatBotRunFinishedChunk,
  ChatBotTextContentChunkSchema,
  ChatBotToolCallResultChunkSchema,
  ChatBotToolCallStartChunkSchema,
} from "../schemas";
import type {
  ChatBotCollectedTurn,
  ChatBotServices,
  ChatBotToolSpec,
  ChatBotTurnUsage,
} from "../types";
import { appendChatBotToolResult, parseChatBotToolResultContent } from "../tools/tool-structure";

// -----
// One finished run's tokens, from either the
// AG-UI usage[] or TanStack's own shape.
// -----
const addRunUsage = (
  total: ChatBotTurnUsage | null,
  chunk: ChatBotRunFinishedChunk,
): ChatBotTurnUsage | null => {
  const { usage } = chunk;
  if (!usage) return total;
  const run = Array.isArray(usage)
    ? usage.reduce(
        (sum, u) => ({
          model: sum.model ?? u.model ?? null,
          inputTokens: sum.inputTokens + (u.inputTokens ?? 0),
          cachedTokens: sum.cachedTokens + (u.cachedInputTokens ?? 0),
          outputTokens: sum.outputTokens + (u.outputTokens ?? 0),
        }),
        { model: chunk.model ?? null, inputTokens: 0, cachedTokens: 0, outputTokens: 0 },
      )
    : {
        model: chunk.model ?? null,
        inputTokens: usage.promptTokens,
        cachedTokens: usage.promptTokensDetails?.cachedTokens ?? 0,
        outputTokens: usage.completionTokens,
      };
  if (!total) return run;
  return {
    model: total.model ?? run.model,
    inputTokens: total.inputTokens + run.inputTokens,
    cachedTokens: total.cachedTokens + run.cachedTokens,
    outputTokens: total.outputTokens + run.outputTokens,
  };
};

// -----
// Save main's text plus real tool results;
// emit each card live so it matches a reload.
// A child's text carries its subagentRunId
// and is not the answer.
// -----
export async function* collectChatBotTurn<S extends ChatBotServices>(
  source: AsyncIterable<StreamChunk>,
  specs: ReadonlyArray<ChatBotToolSpec<S>>,
  onComplete: (turn: ChatBotCollectedTurn) => Promise<void>,
): AsyncGenerator<StreamChunk> {
  const specsByName = new Map(specs.map((spec) => [spec.definition.name, spec]));
  const namesByCallId = new Map<string, string>();
  const toolsUsed: string[] = [];
  const textByMessageId = new Map<string, string>();
  let structure: ChatBotStructure = {};
  let usage: ChatBotTurnUsage | null = null;
  try {
    for await (const chunk of source) {
      yield chunk;

      const start = ChatBotToolCallStartChunkSchema.safeParse(chunk);
      if (start.success) {
        namesByCallId.set(start.data.toolCallId, start.data.toolCallName);
        continue;
      }

      const result = ChatBotToolCallResultChunkSchema.safeParse(chunk);
      if (result.success) {
        const tool = namesByCallId.get(result.data.toolCallId);
        if (!tool) continue;
        // -----
        // A subagent call has no spec; its own
        // tool calls stream through with cards.
        // -----
        const spec = specsByName.get(tool);
        if (!spec) continue;
        const entry = {
          display: spec.display ?? null,
          displayOptions: spec.displayOptions ?? null,
        };
        const value = parseChatBotToolResultContent(result.data.content);
        structure = appendChatBotToolResult(structure, tool, entry, value);
        if (!toolsUsed.includes(tool)) toolsUsed.push(tool);
        const event: ChatBotToolDisplayEventValue = {
          toolCallId: result.data.toolCallId,
          tool,
          ...entry,
          result: value,
        };
        yield {
          type: "CUSTOM",
          name: CHAT_BOT_TOOL_DISPLAY_EVENT,
          value: event,
          timestamp: new Date().getTime(),
        };
        continue;
      }

      const finished = ChatBotRunFinishedChunkSchema.safeParse(chunk);
      if (finished.success) {
        usage = addRunUsage(usage, finished.data);
        continue;
      }
      const text = ChatBotTextContentChunkSchema.safeParse(chunk);
      if (text.success && !text.data.subagentRunId) {
        const { messageId, delta } = text.data;
        textByMessageId.set(messageId, (textByMessageId.get(messageId) ?? "") + delta);
      }
    }
  } finally {
    const answer = [...textByMessageId.values()]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n\n");
    if (answer) await onComplete({ answer, toolsUsed, structure, usage });
  }
}
