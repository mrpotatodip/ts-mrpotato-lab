import { describe, expect, it } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { createChatBotRunner } from "@repo/chat-bot-api";
import { createNotesApp } from "../index";
import type { Services } from "../notes";

// -----
// A model that "decides" to save a note by
// running the agent's own tool through the
// runtime the engine built for it.
// -----
async function* saveANote(): AsyncGenerator<StreamChunk> {
  yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "Saved." };
}

const setup = () => {
  const jobs: Array<Promise<unknown>> = [];
  const runner = createChatBotRunner<Services>({
    // SAFETY: the stubbed run below never reads the adapter.
    adapterFor: () => "adapter" as never,
  });
  const { app, notebook } = createNotesApp({ runner: { ...runner, run: () => saveANote() }, model: "any-model" });
  const call = (path: string, headers: Record<string, string>, init: RequestInit = {}) =>
    app.request(
      path,
      { ...init, headers: { "content-type": "application/json", ...headers } },
      {},
      {
        waitUntil: (job: Promise<unknown>) => {
          jobs.push(job);
        },
        passThroughOnException: () => undefined,
        props: {},
      },
    );
  return { call, notebook, settle: () => Promise.all(jobs) };
};

const acme = { "x-workspace": "acme", "x-member": "ada" };

describe("a notes assistant on the engine", () => {
  it("answers and keeps a thread per member", async () => {
    const { call, settle } = setup();

    const sent = await call("/chat", { ...acme, "x-run-id": crypto.randomUUID() }, {
      method: "POST",
      body: JSON.stringify({ content: "Remember milk" }),
    });
    await settle();

    expect(sent.status).toBe(200);
    expect((await call("/chat/threads", acme)).status).toBe(200);
    const other = await call(`/chat/threads/${sent.headers.get("x-thread-id")}`, {
      "x-workspace": "acme",
      "x-member": "eve",
    });
    expect(other.status).toBe(404);
  });

  it("refuses a request that names no workspace", async () => {
    const { call } = setup();

    expect((await call("/chat/threads", { "x-member": "ada" })).status).toBe(401);
  });

  it("hands its own tools the host's notebook and the owner's workspace", async () => {
    const { notebook } = setup();
    const { notesTools } = await import("../notes");
    const add = notesTools[0];

    // SAFETY: tools are listed in order in notes.ts.
    const result = await import("effect").then(({ Effect }) =>
      Effect.runPromise(
        add!.execute(
          { text: "milk" },
          { notebook, owner: { kind: "user", scopeId: "acme", userId: "ada" } },
        ),
      ),
    );

    expect(result).toEqual({ count: 1 });
    expect(notebook.get("acme")).toEqual(["milk"]);
    expect(notebook.get("globex")).toBeUndefined();
  });
});
