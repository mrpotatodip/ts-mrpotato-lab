import { EventType, type StreamChunk } from "@tanstack/ai";
import type {
  AGUILoadingStackedEvent,
  AGUILoadingSubagentTag,
} from "#/components/agui-loading";

// -----
// Keep a subagent's run tag so its rows
// show under its name.
// -----
function subagentTag(chunk: StreamChunk): AGUILoadingSubagentTag {
  return "subagentRunId" in chunk && chunk.subagentRunId
    ? { subagentRunId: chunk.subagentRunId }
    : {};
}

// -----
// Copy field by field: @tanstack/ai types some
// fields looser than the loader expects.
// -----
export function toChatBotStackedEvent(chunk: StreamChunk): AGUILoadingStackedEvent | null {
  switch (chunk.type) {
    case EventType.RUN_STARTED:
      return { type: EventType.RUN_STARTED, runId: chunk.runId, threadId: chunk.threadId };
    case EventType.RUN_FINISHED:
      return { type: EventType.RUN_FINISHED, runId: chunk.runId };
    case EventType.RUN_ERROR:
      return { type: EventType.RUN_ERROR, message: chunk.message, code: chunk.code };
    case EventType.TEXT_MESSAGE_START:
      // -----
      // No role means the assistant's.
      // -----
      return {
        ...subagentTag(chunk),
        type: EventType.TEXT_MESSAGE_START,
        messageId: chunk.messageId,
        role: chunk.role ?? "assistant",
      };
    case EventType.TEXT_MESSAGE_CONTENT:
      return {
        ...subagentTag(chunk),
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: chunk.messageId,
        delta: chunk.delta,
      };
    case EventType.TEXT_MESSAGE_END:
      return {
        ...subagentTag(chunk),
        type: EventType.TEXT_MESSAGE_END,
        messageId: chunk.messageId,
      };
    case EventType.TOOL_CALL_START:
      return {
        ...subagentTag(chunk),
        type: EventType.TOOL_CALL_START,
        toolCallId: chunk.toolCallId,
        toolCallName: chunk.toolCallName,
      };
    case EventType.TOOL_CALL_RESULT:
      return {
        ...subagentTag(chunk),
        type: EventType.TOOL_CALL_RESULT,
        toolCallId: chunk.toolCallId,
        // -----
        // Multi-part results arrive as ContentPart[].
        // -----
        content: Array.isArray(chunk.content) ? JSON.stringify(chunk.content) : chunk.content,
      };
    case EventType.TOOL_CALL_END:
      return {
        ...subagentTag(chunk),
        type: EventType.TOOL_CALL_END,
        toolCallId: chunk.toolCallId,
      };
    case EventType.REASONING_START:
      return {
        ...subagentTag(chunk),
        type: EventType.REASONING_START,
        messageId: chunk.messageId,
      };
    case EventType.REASONING_MESSAGE_START:
      return {
        ...subagentTag(chunk),
        type: EventType.REASONING_MESSAGE_START,
        messageId: chunk.messageId,
      };
    case EventType.REASONING_MESSAGE_CONTENT:
      return {
        ...subagentTag(chunk),
        type: EventType.REASONING_MESSAGE_CONTENT,
        messageId: chunk.messageId,
        delta: chunk.delta,
      };
    case EventType.REASONING_MESSAGE_END:
      return {
        ...subagentTag(chunk),
        type: EventType.REASONING_MESSAGE_END,
        messageId: chunk.messageId,
      };
    case EventType.REASONING_END:
      return {
        ...subagentTag(chunk),
        type: EventType.REASONING_END,
        messageId: chunk.messageId,
      };
    case EventType.SUBAGENT_STARTED:
      return {
        type: EventType.SUBAGENT_STARTED,
        subagentRunId: chunk.subagentRunId,
        name: chunk.name,
        description: chunk.description,
        parentSubagentRunId: chunk.parentSubagentRunId,
        parentToolCallId: chunk.parentToolCallId,
      };
    case EventType.SUBAGENT_FINISHED:
      return { type: EventType.SUBAGENT_FINISHED, subagentRunId: chunk.subagentRunId };
    case EventType.SUBAGENT_ERROR:
      return {
        type: EventType.SUBAGENT_ERROR,
        subagentRunId: chunk.subagentRunId,
        message: chunk.message,
        code: chunk.code,
      };
    default:
      return null;
  }
}
