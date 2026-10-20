import { act, cleanup, render } from "@testing-library/react";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { afterEach, describe, expect, it, vi } from "vitest";

const played = vi.hoisted(() => [] as unknown[]);
vi.mock("../sounds/react-bits-sound", () => ({
  playSound: vi.fn((recipe: unknown) => {
    played.push(recipe);
    return Promise.resolve();
  }),
}));

import { ChatBotProgress, useChatBotProgress } from "../index";
import petal from "../sounds/petal";
import ripple from "../sounds/ripple";

afterEach(() => {
  cleanup();
  played.length = 0;
});

const chunk = (c: Record<string, unknown>) => c as unknown as StreamChunk;

function Harness({ sounds }: Pick<Parameters<typeof ChatBotProgress>[0], "sounds">) {
  const progress = useChatBotProgress();
  (globalThis as { __progress?: typeof progress }).__progress = progress;
  return <ChatBotProgress state={progress.state} sounds={sounds} />;
}
const progress = () => (globalThis as unknown as { __progress: ReturnType<typeof useChatBotProgress> }).__progress;

describe("progress sounds", () => {
  // Sounds load on demand, so assert with waitFor.
  const send = async (...chunks: Record<string, unknown>[]) => {
    await act(async () => {
      for (const c of chunks) progress().onChunk(chunk(c));
    });
  };

  it("plays one sound per level as it finishes, and one for the turn", async () => {
    const run = { layers: [1] }, tools = { layers: [2] }, reply = { layers: [3] }, turn = { layers: [4] };
    render(<Harness sounds={{ end: { run, tools, reply, turn } }} />);
    await act(async () => progress().onTurnStart());
    await send({ type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "x" });
    await vi.waitFor(() => expect(played).toEqual([run]));
    await send({ type: EventType.TOOL_CALL_END, toolCallId: "c1" }, { type: EventType.TOOL_CALL_RESULT, toolCallId: "c1", content: "{}" });
    await send({ type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant" });
    await vi.waitFor(() => expect(played).toEqual([run, tools]));
    await send({ type: EventType.TEXT_MESSAGE_END, messageId: "m1" }, { type: EventType.RUN_FINISHED, runId: "r1" });
    await vi.waitFor(() => expect(played).toEqual([run, tools, reply, turn]));
  });

  it("picks a tool's sound by name, and stays silent for an unlisted one", async () => {
    const lookup = { layers: [] };
    render(<Harness sounds={{ end: { tools: { lookupOrder: lookup } } }} />);
    await act(async () => progress().onTurnStart());
    await send(
      { type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "lookupOrder" },
      { type: EventType.TOOL_CALL_END, toolCallId: "c1" },
      { type: EventType.TOOL_CALL_RESULT, toolCallId: "c1", content: "{}" },
      { type: EventType.TOOL_CALL_START, toolCallId: "c2", toolCallName: "other" },
      { type: EventType.TOOL_CALL_END, toolCallId: "c2" },
      { type: EventType.TOOL_CALL_RESULT, toolCallId: "c2", content: "{}" },
      { type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant" },
    );
    await vi.waitFor(() => expect(played).toEqual([lookup]));
  });

  it("plays a start sound as each level appears, and when the turn begins", async () => {
    const begin = { layers: [5] }, toolStart = { layers: [6] }, replyStart = { layers: [7] };
    render(<Harness sounds={{ start: { turn: begin, tools: toolStart, reply: replyStart } }} />);
    await act(async () => progress().onTurnStart());
    await vi.waitFor(() => expect(played).toEqual([begin]));
    await send({ type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "x" });
    await vi.waitFor(() => expect(played).toEqual([begin, toolStart]));
    await send({ type: EventType.TOOL_CALL_END, toolCallId: "c1" }, { type: EventType.TOOL_CALL_RESULT, toolCallId: "c1", content: "{}" });
    await send({ type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant" });
    await vi.waitFor(() => expect(played).toEqual([begin, toolStart, replyStart]));
  });

  it("true plays the built-ins for tools and replies, but not for run or turn", async () => {
    render(<Harness sounds />);
    await act(async () => progress().onTurnStart());
    await vi.waitFor(() => expect(played).toEqual([]));
    await send({ type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "x" });
    await vi.waitFor(() => expect(played).toEqual([ripple]));
    await send({ type: EventType.TOOL_CALL_END, toolCallId: "c1" }, { type: EventType.TOOL_CALL_RESULT, toolCallId: "c1", content: "{}" });
    await send({ type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant" });
    await vi.waitFor(() => expect(played).toEqual([ripple, petal, ripple]));
    await send({ type: EventType.TEXT_MESSAGE_END, messageId: "m1" }, { type: EventType.RUN_FINISHED, runId: "r1" });
    await vi.waitFor(() => expect(played).toEqual([ripple, petal, ripple, petal]));
  });

  it("is silent without sounds, and for levels left out", async () => {
    render(<Harness sounds={undefined} />);
    await act(async () => progress().onTurnStart());
    await send({ type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "x" });
    await vi.waitFor(() => expect(played).toEqual([]));
  });
});
