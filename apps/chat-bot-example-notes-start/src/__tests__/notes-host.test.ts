import { describe, expect, it } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { createChatBotRunner } from "../vendor/chat-bot/chat-bot-api/src";
import { createNotesFetch } from "../server/notes-host";

async function* reply(): AsyncGenerator<StreamChunk> {
  yield {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId: "m1",
    delta: "Saved.",
  };
}

// -----
// The Start route's handler with a fake model:
// what the page would send, and what comes back.
// -----
const setup = () => {
  const runner = createChatBotRunner({
    // SAFETY: the stubbed run never reads the adapter.
    adapterFor: () => "adapter" as never,
  });
  return createNotesFetch({
    runner: { ...runner, run: () => reply() },
    model: "any-model",
  });
};

const send = (fetcher: ReturnType<typeof setup>, text: string, cookie = "") =>
  fetcher(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-run-id": crypto.randomUUID(),
        cookie,
      },
      body: JSON.stringify({
        messages: [{ role: "user", parts: [{ type: "text", content: text }] }],
      }),
    }),
  );

describe("the notes host inside a Start server route", () => {
  it("takes what useChat posts and keeps a thread for the cookie's member", async () => {
    const fetcher = setup();

    const sent = await send(fetcher, "remember milk", "member=ada");
    await sent.text();

    const mine = await fetcher(
      new Request("http://localhost/api/chat/threads", {
        headers: { cookie: "member=ada" },
      }),
    );
    const theirs = await fetcher(
      new Request("http://localhost/api/chat/threads", {
        headers: { cookie: "member=eve" },
      }),
    );
    expect(sent.headers.get("x-thread-id")).toBeTruthy();
    expect(await mine.json()).toMatchObject({
      data: [{ title: "remember milk" }],
    });
    expect(await theirs.json()).toMatchObject({ data: [] });
  });

  it("ignores identity headers the browser sends", async () => {
    const fetcher = setup();
    await (await send(fetcher, "mine", "member=ada")).text();

    const spoof = await fetcher(
      new Request("http://localhost/api/chat/threads", {
        headers: {
          cookie: "member=eve",
          "x-member": "ada",
          "x-workspace": "demo",
        },
      }),
    );

    expect(await spoof.json()).toMatchObject({ data: [] });
  });
});
