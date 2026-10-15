import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EventType } from "@tanstack/ai";
import { afterEach, describe, expect, it } from "vitest";
import { ChatBotProgress, ChatBotWithProgress, useChatBotProgress } from "../index";
import { renderHook, act } from "@testing-library/react";

afterEach(cleanup);

const sse = (events: unknown[], headers: Record<string, string> = {}) =>
  new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream", ...headers },
  });

// -----
// The engine's real order for a turn with a tool: the first
// model call finishes asking for tools (finishReason
// "tool_calls"), then the result and the answer follow.
// -----
const turnWithTool = [
  { type: EventType.RUN_STARTED, runId: "r1", threadId: "t", timestamp: 1 },
  { type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "lookupOrder", timestamp: 2 },
  { type: EventType.TOOL_CALL_END, toolCallId: "c1", timestamp: 3 },
  {
    type: EventType.RUN_FINISHED,
    runId: "r1",
    threadId: "t",
    timestamp: 3,
    metadata: { tanstack: { finishReason: "tool_calls" } },
  },
  { type: EventType.TOOL_CALL_RESULT, toolCallId: "c1", messageId: "m0", content: "{\"status\":\"shipped\"}", timestamp: 4 },
  { type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant", timestamp: 5 },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "Your order shipped.", timestamp: 6 },
  { type: EventType.TEXT_MESSAGE_END, messageId: "m1", timestamp: 7 },
  {
    type: EventType.RUN_FINISHED,
    runId: "r2",
    threadId: "t",
    timestamp: 8,
    metadata: { tanstack: { finishReason: "stop" } },
  },
];

const server = (events: unknown[]) =>
  (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://app.test");
    if (init?.method === "POST") return sse(events, { "x-thread-id": "11111111-1111-4111-8111-111111111111" });
    if (url.pathname.endsWith("/threads")) return Response.json({ data: [], error: null });
    return new Response("not found", { status: 404 });
  }) as typeof globalThis.fetch;

describe("useChatBotProgress", () => {
  it("starts a turn on send, adds a row per step, and clears on the next send", () => {
    const { result } = renderHook(() => useChatBotProgress());
    expect(result.current.state.status).toBe("idle");

    act(() => result.current.onTurnStart());
    expect(result.current.state.status).toBe("running");

    act(() => {
      result.current.onChunk({ type: EventType.RUN_STARTED, runId: "r", threadId: "t", timestamp: 1 });
      result.current.onChunk({ type: EventType.TOOL_CALL_START, toolCallId: "c", toolCallName: "x", timestamp: 2 });
    });
    expect(result.current.state.status).toBe("running");
    const rows = Object.keys(result.current.state.steps).length;
    expect(rows).toBeGreaterThan(1);

    act(() => result.current.onChunk({ type: EventType.RUN_FINISHED, runId: "r", threadId: "t", timestamp: 3 }));
    expect(result.current.state.status).toBe("done");

    act(() => result.current.onTurnStart());
    expect(result.current.state.status).toBe("running");
    expect(Object.keys(result.current.state.steps).length).toBeLessThan(rows);
  });
});

describe("<ChatBotWithProgress />", () => {
  it("shows a row for the tool call, in your words, while and after the answer streams", async () => {
    render(
      <ChatBotWithProgress
        threads={false}
        fetch={server(turnWithTool)}
        labels={{ tools: { lookupOrder: { busy: "Looking up your order", done: "Found your order" } } }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "where is my order" } });
    fireEvent.submit(screen.getByLabelText("Message").closest("form")!);

    await screen.findByText("Your order shipped.");
    await waitFor(() => expect(screen.getAllByText("Found your order").length).toBeGreaterThan(0));
    expect(screen.queryByLabelText("Assistant is typing")).toBeNull();
    await waitFor(() => expect(screen.getAllByText("Reply written").length).toBeGreaterThan(0));
    expect(document.querySelectorAll(".cbl-row").length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to a generic label for a tool you did not name, never the code name", async () => {
    render(<ChatBotWithProgress threads={false} fetch={server(turnWithTool)} />);

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hi" } });
    fireEvent.submit(screen.getByLabelText("Message").closest("form")!);

    await screen.findByText("Your order shipped.");
    await waitFor(() => expect(screen.getAllByText("Finished a step").length).toBeGreaterThan(0));
    expect(document.querySelector(".cbl-progress")?.textContent).not.toContain("lookupOrder");
  });
});

describe("<ChatBotProgress />", () => {
  it("renders nothing while idle", () => {
    const { container } = render(<ChatBotProgress state={{ status: "idle", steps: {}, order: [] } as never} />);
    expect(container.textContent).toBe("");
  });
});
