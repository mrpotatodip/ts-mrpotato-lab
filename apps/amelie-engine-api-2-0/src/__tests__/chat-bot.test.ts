import { describe, expect, it } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import type { ChatBotRunner } from "@repo/chat-bot-api";
import { ChatBotThreadDetailSchema, ChatBotThreadListItemSchema } from "@repo/chat-bot-api/contracts";
import { z } from "zod";
import type { Services } from "../agent";
import { chatBotRoutes } from "../chat-bot";
import { createApp } from "../index";

async function* reply(): AsyncGenerator<StreamChunk> {
  yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "Hello " };
  yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "there" };
}

// -----
// SAFETY: the fake runner never reads the adapter.
// -----
const fakeRunner: ChatBotRunner<Services> = {
  run: () => reply(),
  adapterFor: () => "adapter" as never,
  route: undefined,
};

const setup = () => {
  const jobs: Array<Promise<unknown>> = [];
  const app = createApp(chatBotRoutes(() => fakeRunner));
  const call = (path: string, init: RequestInit = {}, user = "ada") =>
    app.request(
      path,
      { ...init, headers: { "x-user-id": user, "content-type": "application/json", ...init.headers } },
      { OPENAI_API_KEY: "unused" },
      {
        waitUntil: (job: Promise<unknown>) => {
          jobs.push(job);
        },
        passThroughOnException: () => undefined,
        props: {},
      },
    );
  return { call, settle: () => Promise.all(jobs) };
};

describe("the chat bot, wired", () => {
  it("answers a message and keeps the thread", async () => {
    const { call, settle } = setup();

    const streamed = await call("/chat-bot", {
      method: "POST",
      headers: { "x-run-id": crypto.randomUUID() },
      body: JSON.stringify({ content: "Hi" }),
    });
    await settle();
    const threadId = streamed.headers.get("x-thread-id");

    const read = z.object({ data: ChatBotThreadDetailSchema }).parse(await (await call(`/chat-bot/threads/${threadId}`)).json());
    const listed = z.object({ data: ChatBotThreadListItemSchema.array() }).parse(await (await call("/chat-bot/threads")).json());
    expect(read.data.messages.map((m) => m.content)).toEqual(["Hi", "Hello there"]);
    expect(listed.data).toHaveLength(1);
  });

  it("keeps one user's thread from another", async () => {
    const { call, settle } = setup();
    const streamed = await call("/chat-bot", {
      method: "POST",
      headers: { "x-run-id": crypto.randomUUID() },
      body: JSON.stringify({ content: "Secret" }),
    });
    await settle();

    const stranger = await call(`/chat-bot/threads/${streamed.headers.get("x-thread-id")}`, {}, "eve");

    expect(stranger.status).toBe(404);
  });

  it("asks for a user and refuses bad input in the same envelope", async () => {
    const { call } = setup();

    const anonymous = await call("/chat-bot/threads", { headers: { "x-user-id": "" } });
    const badId = await call("/chat-bot/threads/not-a-uuid");

    expect(anonymous.status).toBe(401);
    expect(badId.status).toBe(400);
    expect(await badId.json()).toMatchObject({ data: null, error: { code: "HTTP_ERROR" } });
  });
});
