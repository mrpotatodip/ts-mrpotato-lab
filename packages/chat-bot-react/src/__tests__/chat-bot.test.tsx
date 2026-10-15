import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EventType } from "@tanstack/ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatBot, ChatBotRoom } from "../index";

afterEach(cleanup);

const THREAD = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const sse = (events: unknown[], headers: Record<string, string> = {}) =>
  new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream", ...headers },
  });

const answer = (text: string) => [
  { type: EventType.RUN_STARTED, runId: "run-1", threadId: "t", timestamp: 1 },
  { type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant", timestamp: 2 },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: text, timestamp: 3 },
  { type: EventType.TEXT_MESSAGE_END, messageId: "m1", timestamp: 4 },
  { type: EventType.RUN_FINISHED, runId: "run-1", threadId: "t", timestamp: 5 },
];

const envelope = (data: unknown) => Response.json({ data, error: null });

const threadRow = (id: string, title: string) => ({
  id,
  title,
  trigger: "chat",
  module: "chat",
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
});

type Handler = (request: Request) => Response | Promise<Response>;

// -----
// A fake server: the first handler whose method and path
// match answers. Every call is kept, so a test can look.
// -----
function fakeServer(routes: Array<[string, string, Handler]>) {
  const calls: Request[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(new URL(String(input), "http://app.test"), init);
    calls.push(request);
    const url = new URL(request.url);
    const route = routes.find(
      ([method, path]) => method === request.method && path === `${url.pathname}${url.search}`,
    );
    return route ? route[2](request) : new Response("not found", { status: 404 });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const type = (text: string) => {
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: text } });
  fireEvent.submit(screen.getByLabelText("Message").closest("form")!);
};

describe("<ChatBotRoom />", () => {
  it("sends a message, shows the streamed answer, and keeps the thread it was given", async () => {
    const created = vi.fn();
    const server = fakeServer([
      ["POST", "/api/chat", () => sse(answer("Hello there"), { "x-thread-id": THREAD })],
      ["POST", `/api/chat?threadId=${THREAD}`, () => sse(answer("Again"), { "x-thread-id": THREAD })],
    ]);
    render(<ChatBotRoom fetch={server.fetch} onThreadCreated={created} />);

    type("Hi");
    await screen.findByText("Hello there");
    type("More");
    await screen.findByText("Again");

    expect(screen.getByText("Hi")).toBeTruthy();
    expect(created).toHaveBeenCalledExactlyOnceWith(THREAD);
    const posts = server.calls.filter((call) => call.method === "POST");
    expect(posts.map((call) => new URL(call.url).search)).toEqual(["", `?threadId=${THREAD}`]);
    expect(JSON.stringify(await posts[0]!.json())).toContain("Hi");
  });

  it("sends the headers you give it, fresh on each request", async () => {
    let token = "one";
    const server = fakeServer([["POST", "/api/chat", () => sse(answer("ok"))]]);
    render(<ChatBotRoom fetch={server.fetch} headers={() => ({ authorization: `Bearer ${token}` })} />);

    type("a");
    await screen.findByText("ok");
    token = "two";
    type("b");
    await waitFor(() => expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(2));

    expect(server.calls.map((call) => call.headers.get("authorization"))).toEqual(["Bearer one", "Bearer two"]);
  });

  it("shows the server's error and no stop button when idle", async () => {
    const server = fakeServer([
      ["POST", "/api/chat", () => Response.json({ data: null, error: { message: "Sign in first" } }, { status: 401 })],
    ]);
    render(<ChatBotRoom fetch={server.fetch} />);

    type("Hi");

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Stop")).toBeNull();
  });
});

describe("extension points", () => {
  it("hands every stream event and the start of each turn to the host, and shows its progress in place of the dots", async () => {
    const chunks: string[] = [];
    const starts = vi.fn();
    const server = fakeServer([["POST", "/api/chat", () => sse(answer("Done"))]]);
    render(
      <ChatBotRoom
        fetch={server.fetch}
        onChunk={(chunk) => chunks.push(chunk.type)}
        onTurnStart={starts}
        progress={<p>custom progress</p>}
      />,
    );

    type("Hi");
    await screen.findByText("Done");

    expect(starts).toHaveBeenCalledOnce();
    expect(chunks).toContain("RUN_STARTED");
    expect(chunks).toContain("TEXT_MESSAGE_CONTENT");
    expect(screen.getByText("custom progress")).toBeTruthy();
    expect(screen.queryByLabelText("Assistant is typing")).toBeNull();
  });

  it("lets <ChatBot /> use another room component", async () => {
    const server = fakeServer([["GET", "/api/chat/threads", () => envelope([])]]);
    const Custom = () => <p>my own room</p>;
    render(<ChatBot fetch={server.fetch} room={Custom} />);

    expect(await screen.findByText("my own room")).toBeTruthy();
  });
});

describe("<ChatBot />", () => {
  const stored = {
    messages: [
      { id: "a", role: "user", parts: [{ type: "text", content: "What time is it?" }] },
      {
        id: "b",
        role: "assistant",
        parts: [{ type: "text", content: "It is noon." }],
        metadata: {
          chatBot: {
            toolsUsed: ["currentTime"],
            structure: { currentTime: { display: null, displayOptions: null, results: [{ iso: "2026-10-14T12:00:00Z" }] } },
          },
        },
      },
    ],
    activeRun: null,
  };

  it("lists past chats, opens one with its messages and tool results, and starts a new one", async () => {
    const server = fakeServer([
      ["GET", "/api/chat/threads", () => envelope([threadRow(THREAD, "Clock"), threadRow(OTHER, "Other")])],
      ["GET", `/api/chat?threadId=${THREAD}`, () => Response.json(stored)],
    ]);
    render(
      <ChatBot
        fetch={server.fetch}
        tools={{ currentTime: (call) => <p>custom card for {call.name}</p> }}
      />,
    );

    fireEvent.click(await screen.findByText("Clock"));

    await screen.findByText("It is noon.");
    expect(screen.getByText("What time is it?")).toBeTruthy();
    expect(screen.getByText("custom card for currentTime")).toBeTruthy();

    fireEvent.click(screen.getByText("New chat"));
    await waitFor(() => expect(screen.queryByText("It is noon.")).toBeNull());
    expect(screen.getByText("Ask me anything.")).toBeTruthy();
  });

  it("shows tool results as a folded card when you give it no renderer", async () => {
    const server = fakeServer([
      ["GET", "/api/chat/threads", () => envelope([threadRow(THREAD, "Clock")])],
      ["GET", `/api/chat?threadId=${THREAD}`, () => Response.json(stored)],
    ]);
    render(<ChatBot fetch={server.fetch} />);

    fireEvent.click(await screen.findByText("Clock"));

    const summary = await screen.findByText("currentTime");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.parentElement?.textContent).toContain("2026-10-14T12:00:00Z");
  });

  it("renames and deletes a chat through the API, then reloads the list", async () => {
    let rows = [threadRow(THREAD, "Old name")];
    const server = fakeServer([
      ["GET", "/api/chat/threads", () => envelope(rows)],
      [
        "PATCH",
        `/api/chat/threads/${THREAD}`,
        async (request) => {
          const { title } = (await request.json()) as { title: string };
          rows = [threadRow(THREAD, title)];
          return envelope(rows[0]);
        },
      ],
      [
        "DELETE",
        `/api/chat/threads/${THREAD}`,
        () => {
          rows = [];
          return envelope({ id: THREAD });
        },
      ],
    ]);
    vi.spyOn(window, "prompt").mockReturnValue("New name");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ChatBot fetch={server.fetch} />);

    fireEvent.click(await screen.findByLabelText("Rename Old name"));
    await screen.findByText("New name");
    fireEvent.click(screen.getByLabelText("Delete New name"));

    await waitFor(() => expect(screen.queryByText("New name")).toBeNull());
  });

  it("can hide the chat list", async () => {
    const server = fakeServer([["GET", "/api/chat/threads", () => envelope([])]]);
    render(<ChatBot fetch={server.fetch} threads={false} />);

    expect(screen.queryByText("New chat")).toBeNull();
    expect(screen.getByLabelText("Message")).toBeTruthy();
  });
});
