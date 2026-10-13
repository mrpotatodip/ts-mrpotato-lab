import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { EventType, type StreamChunk } from "@tanstack/ai";

import { useChatBotStreamState } from "../../hooks/use-chat-bot-stream-state";
import {
  isChatBotAnswerStep,
  recordChatBotStreamEvent,
  startChatBotStreamTurn,
} from "../chat-bot-stream-event-store";

// -----
// A real "2 + 2" turn: no RUN_STARTED until
// the answer step opens one mid-turn.
// -----
const turn: Array<StreamChunk> = [
  { type: EventType.TOOL_CALL_START, toolCallId: "call-1", toolCallName: "addTwoNumbers", timestamp: 1 },
  { type: EventType.TOOL_CALL_END, toolCallId: "call-1", timestamp: 2 },
  {
    type: EventType.TOOL_CALL_RESULT,
    toolCallId: "call-1",
    messageId: "m1",
    content: '{"a":2,"b":2,"sum":4}',
    timestamp: 3,
  },
  { type: EventType.CUSTOM, name: "chat-bot.tool-display", value: {}, timestamp: 4 },
  { type: EventType.TEXT_MESSAGE_START, messageId: "prose", timestamp: 5 },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "prose", delta: "Adding them.", timestamp: 6 },
  { type: EventType.TEXT_MESSAGE_END, messageId: "prose", timestamp: 7 },
  { type: EventType.RUN_STARTED, runId: "answer-run", threadId: "thread-1", timestamp: 8 },
  { type: EventType.CUSTOM, name: "structured-output.start", value: {}, timestamp: 9 },
  { type: EventType.TEXT_MESSAGE_START, messageId: "answer", timestamp: 9 },
  { type: EventType.TEXT_MESSAGE_END, messageId: "answer", timestamp: 10 },
  { type: EventType.RUN_FINISHED, runId: "answer-run", threadId: "thread-1", timestamp: 11 },
];

function currentState() {
  return renderHook(() => useChatBotStreamState()).result.current;
}

function kinds() {
  const state = currentState();
  return state.stepOrder.map((id) => state.steps[id]?.kind);
}

describe("chat-bot stream state", () => {
  it("starts a live turn on send, before any chunk arrives", () => {
    startChatBotStreamTurn();

    expect(currentState().status).toBe("running");
    expect(kinds()).toEqual(["run"]);
  });

  it("keeps the tool row through the answer step's mid-turn RUN_STARTED", () => {
    for (const chunk of turn.slice(0, 7)) recordChatBotStreamEvent(chunk);
    expect(kinds()).toEqual(["run", "tool", "message"]);

    for (const chunk of turn.slice(7)) recordChatBotStreamEvent(chunk);
    const state = currentState();
    expect(state.status).toBe("done");
    expect(kinds()).toEqual(["run", "tool", "message", "message"]);
    expect(state.steps["tool:call-1"]?.toolCallName).toBe("addTwoNumbers");
  });

  it("marks the message after structured-output.start as the answer", () => {
    expect(isChatBotAnswerStep("message:answer")).toBe(true);
    expect(isChatBotAnswerStep("message:prose")).toBe(false);
  });

  it("ignores stragglers after the turn is done", () => {
    recordChatBotStreamEvent({
      type: EventType.TOOL_CALL_START,
      toolCallId: "late",
      toolCallName: "addTwoNumbers",
      timestamp: 12,
    });

    expect(currentState().status).toBe("done");
  });

  it("starts the next turn clean on the next send", () => {
    startChatBotStreamTurn();

    expect(currentState().status).toBe("running");
    expect(kinds()).toEqual(["run"]);
    expect(isChatBotAnswerStep("message:answer")).toBe(false);
  });

  it("shows a subagent's work under its name, as part of the same turn", () => {
    startChatBotStreamTurn();
    // -----
    // Router mode: the child runs first,
    // with no parent tool call.
    // -----
    const delegated: Array<StreamChunk> = [
      { type: EventType.SUBAGENT_STARTED, subagentRunId: "sub-1", name: "calculator", timestamp: 2 },
      {
        type: EventType.TOOL_CALL_START,
        toolCallId: "call-add",
        toolCallName: "addTwoNumbers",
        subagentRunId: "sub-1",
        timestamp: 3,
      },
      {
        type: EventType.TOOL_CALL_RESULT,
        toolCallId: "call-add",
        messageId: "m-child",
        content: '{"a":2,"b":3,"sum":5}',
        subagentRunId: "sub-1",
        timestamp: 4,
      },
      { type: EventType.SUBAGENT_FINISHED, subagentRunId: "sub-1", timestamp: 5 },
    ];
    for (const chunk of delegated) recordChatBotStreamEvent(chunk);

    const state = currentState();
    expect(state.status).toBe("running");
    const childTool = state.steps["tool:call-add"];
    expect(childTool?.subagentRunId).toBe("sub-1");
    expect(childTool?.subagentName).toBe("calculator");
    expect(kinds()).toContain("subagent");
  });
});
