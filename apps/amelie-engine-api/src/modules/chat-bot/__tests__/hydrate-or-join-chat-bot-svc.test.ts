import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { Invalid, NotFound } from "#/lib/effect-query";
import { hydrateOrJoinChatBotSvc } from "#/modules/chat-bot/handlers";
import {
  createChatBotDurableStream,
  memoryChatBotDurableStreamStore,
} from "@repo/chat-bot-durable-stream";
import { chatBotDurableStreamOptions } from "#/modules/chat-bot/lib";
import type { ChatBotDurableStreams } from "#/modules/chat-bot/types";
import { stubDb } from "./chat-bot-stub-db";

const threadId = "11111111-1111-4111-8111-111111111111";

const memoryStreams = (
  store = memoryChatBotDurableStreamStore(),
): ChatBotDurableStreams => (init) =>
  createChatBotDurableStream(store, { ...init, ...chatBotDurableStreamOptions });

const run = (...args: Parameters<typeof hydrateOrJoinChatBotSvc>) =>
  Effect.runPromise(hydrateOrJoinChatBotSvc(...args));

const fail = (...args: Parameters<typeof hydrateOrJoinChatBotSvc>) =>
  Effect.runPromise(Effect.flip(hydrateOrJoinChatBotSvc(...args)));

describe("hydrateOrJoinChatBotSvc", () => {
  it("returns the bare hydrate body TanStack AI reads", async () => {
    const db = stubDb(
      [{ id: threadId, title: null, trigger: "chat", module: "chat" }],
      [],
      [{ id: "run-1" }],
    );

    const response = await run(
      db,
      memoryStreams(),
      "user-1",
      threadId,
      new Request(`https://chat.local/?threadId=${threadId}`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      messages: [],
      activeRun: { runId: "run-1" },
    });
  });

  it("fails with Invalid for a hydrate with no threadId, before any read", async () => {
    const error = await fail(
      stubDb(new Error("should not be called")),
      memoryStreams(),
      "user-1",
      undefined,
      new Request("https://chat.local/"),
    );

    expect(error).toBeInstanceOf(Invalid);
  });

  it("joins the user's run when the request carries an offset", async () => {
    const durableStream = memoryStreams();
    await durableStream({ runId: "run-1" }).close();

    const response = await run(
      stubDb([{ id: "run-1", threadId }]),
      durableStream,
      "user-1",
      undefined,
      new Request("https://chat.local/?runId=run-1&offset=-1"),
    );

    expect(response.headers.get("X-Thread-Id")).toBe(threadId);
  });

  it("fails with NotFound when joining a run that isn't the user's", async () => {
    const error = await fail(
      stubDb([]),
      memoryStreams(),
      "user-1",
      undefined,
      new Request("https://chat.local/?runId=run-1&offset=-1"),
    );

    expect(error).toBeInstanceOf(NotFound);
  });

  it("fails with Invalid for a join whose Last-Event-ID points into another run", async () => {
    const error = await fail(
      stubDb([{ id: "run-1", threadId }]),
      memoryStreams(),
      "user-1",
      undefined,
      new Request("https://chat.local/?runId=run-1", {
        headers: { "Last-Event-ID": "pg:v1:victim-run:1" },
      }),
    );

    expect(error).toBeInstanceOf(Invalid);
  });
});
