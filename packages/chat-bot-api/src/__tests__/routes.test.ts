import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { Effect } from "effect";
import { EventType, type StreamChunk } from "@tanstack/ai";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";
import { createChatBot, type ChatBotAgent, type ChatBotOwner, type ChatBotRunner } from "../index";
import { createChatBotRoutes } from "../hono";
import { createMemoryChatBotStore } from "../memory";

class BadRequest extends Error {}

const owner: ChatBotOwner = { kind: "user", scopeId: "acme", userId: "ada" };

const agent: ChatBotAgent = {
  id: "main",
  name: "main",
  description: "Test agent.",
  model: "any-model",
  temperature: null,
  prompts: [],
  tools: [],
  subagents: [],
};

async function* reply(): AsyncGenerator<StreamChunk> {
  yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "Hello" };
}

// -----
// A host app in a few lines: its own auth (here,
// a fixed owner), its own error handler, and the
// engine's routes mounted under /chat.
// -----
const buildApp = () => {
  const store = createMemoryChatBotStore();
  const log = memoryChatBotDurableStreamStore();
  const jobs: Array<Promise<void>> = [];
  const runner = {
    run: vi.fn<ChatBotRunner["run"]>(() => reply()),
    // SAFETY: the fake runner never reads the adapter.
    adapterFor: () => "adapter" as never,
    route: undefined,
  } satisfies ChatBotRunner;
  const chat = createChatBot({
    store,
    runner,
    durableStream: (init) => createChatBotDurableStream(log, { ...init, streamPrefix: "chat-bot" }),
    services: {},
    waitUntil: (job) => {
      jobs.push(job);
    },
  });
  const app = new Hono();
  app.route(
    "/chat",
    createChatBotRoutes({
      chat: () => chat,
      owner: () => owner,
      agent: () => agent,
      run: (effect) => Effect.runPromise(effect),
      invalid: (message) => {
        throw new BadRequest(message);
      },
    }),
  );
  app.onError((error, c) =>
    c.json({ data: null, error: { message: error.message } }, error instanceof BadRequest ? 400 : 404),
  );
  return { app, jobs };
};

const post = (app: Hono, body: Record<string, string>, runId = crypto.randomUUID()) =>
  app.request("/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-run-id": runId },
    body: JSON.stringify(body),
  });

describe("createChatBotRoutes", () => {
  it("streams an answer, then lists, reads, renames and deletes the thread", async () => {
    const { app, jobs } = buildApp();

    const streamed = await post(app, { content: "Hi" });
    const threadId = streamed.headers.get("x-thread-id");
    await Promise.all(jobs);

    expect(streamed.status).toBe(200);
    expect(threadId).toBeTruthy();

    const listed = await (await app.request("/chat/threads")).json();
    expect(listed).toMatchObject({ data: [{ id: threadId, title: "Hi" }], error: null });

    const read = await (await app.request(`/chat/threads/${threadId}`)).json();
    expect(read.data.messages.map((m: { content: string }) => m.content)).toEqual(["Hi", "Hello"]);

    const renamed = await (
      await app.request(`/chat/threads/${threadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Greeting" }),
      })
    ).json();
    expect(renamed.data.title).toBe("Greeting");

    const deleted = await (await app.request(`/chat/threads/${threadId}`, { method: "DELETE" })).json();
    expect(deleted).toEqual({ data: { id: threadId }, error: null });
  });

  it("takes what useChat posts: the message list, and the thread in the URL", async () => {
    const { app, jobs } = buildApp();
    const wire = (text: string) => ({
      threadId: "thread-1791930251386-2dsrn",
      runId: "run-1791930251970-cdi6tk",
      state: {},
      forwardedProps: {},
      messages: [
        { role: "user", parts: [{ type: "text", content: "earlier" }] },
        { role: "assistant", parts: [{ type: "text", content: "ok" }] },
        { role: "user", parts: [{ type: "text", content: text }] },
      ],
    });
    const first = await app.request("/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-run-id": crypto.randomUUID() },
      body: JSON.stringify(wire("Hello")),
    });
    await Promise.all(jobs);
    const threadId = first.headers.get("x-thread-id");

    const second = await app.request(`/chat?threadId=${threadId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-run-id": crypto.randomUUID() },
      body: JSON.stringify(wire("Again")),
    });
    await Promise.all(jobs);

    const read = await (await app.request(`/chat/threads/${threadId}`)).json();
    expect(second.headers.get("x-thread-id")).toBe(threadId);
    expect(read.data.messages.map((m: { content: string }) => m.content)).toEqual([
      "Hello",
      "Hello",
      "Again",
      "Hello",
    ]);
  });

  it("refuses a message list with no user text", async () => {
    const { app } = buildApp();

    const response = await app.request("/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-run-id": crypto.randomUUID() },
      body: JSON.stringify({ messages: [{ role: "assistant", content: "hi" }] }),
    });

    expect(response.status).toBe(400);
  });

  it("hydrates a thread with the bare body the client library reads", async () => {
    const { app, jobs } = buildApp();
    const streamed = await post(app, { content: "Hi" });
    const threadId = streamed.headers.get("x-thread-id");
    await Promise.all(jobs);

    const hydrate = await (await app.request(`/chat?threadId=${threadId}`)).json();

    expect(hydrate.activeRun).toBeNull();
    expect(hydrate.messages).toHaveLength(2);
  });

  it("refuses bad input through the host's own error", async () => {
    const { app } = buildApp();

    const emptyContent = await post(app, { content: "" });
    const badThreadId = await app.request("/chat/threads/not-a-uuid");
    const emptyRunId = await app.request("/chat?runId=");

    for (const response of [emptyContent, badThreadId, emptyRunId]) {
      expect(response.status).toBe(400);
    }
  });

  it("answers 404 through the host for a thread that is not the caller's", async () => {
    const { app } = buildApp();

    const response = await app.request(`/chat/threads/${crypto.randomUUID()}`);

    expect(response.status).toBe(404);
  });
});
