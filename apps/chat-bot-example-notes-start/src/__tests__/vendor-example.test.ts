import { describe, expect, it } from "vitest";
import { HttpError, createExampleApp, exampleAgent, DEFAULT_PROMPTS } from "../vendor/chat-bot/example/wiring";

// -----
// The bundle's own example, as a recipient would run it:
// no model call, just the routes and the owner seam.
// -----
const app = createExampleApp({
  // SAFETY: nothing here starts a model turn.
  adapterFor: () => "adapter" as never,
  model: "any-model",
  waitUntil: () => undefined,
  ownerFrom: (request) => {
    const userId = request.headers.get("x-user");
    if (!userId) throw new HttpError("Send x-user", 401);
    return { kind: "user", scopeId: "demo", userId };
  },
});

const call = (path: string, headers: Record<string, string> = {}, init: RequestInit = {}) =>
  app.request(path, { ...init, headers: { "content-type": "application/json", ...headers } }, {}, {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
    props: {},
  });

describe("the bundle's wiring example", () => {
  it("lists nothing for a new user and asks for an owner otherwise", async () => {
    const listed = await call("/chat/threads", { "x-user": "ada" });
    const anonymous = await call("/chat/threads");

    expect(await listed.json()).toEqual({ data: [], error: null });
    expect(anonymous.status).toBe(401);
  });

  it("refuses bad input in the host's own shape", async () => {
    const badId = await call("/chat/threads/not-a-uuid", { "x-user": "ada" });
    const noText = await call("/chat", { "x-user": "ada" }, {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "assistant", content: "hi" }] }),
    });

    expect(badId.status).toBe(400);
    expect(noText.status).toBe(400);
  });
});

describe("setting the system prompt from the call site", () => {
  it("defaults to a short assistant prompt, and takes your own", () => {
    expect(exampleAgent("m").prompts).toEqual(DEFAULT_PROMPTS);
    expect(exampleAgent("m", ["You are support for Acme.", "Never invent order details."]).prompts).toEqual([
      "You are support for Acme.",
      "Never invent order details.",
    ]);
  });

  it("builds the agent per request when you pass `agent`", async () => {
    const asked: string[] = [];
    const custom = createExampleApp({
      // SAFETY: the model is only asked for an adapter; no turn runs to completion here.
      adapterFor: (model) => {
        asked.push(model);
        return "adapter" as never;
      },
      model: "default-model",
      agent: (request) => ({
        ...exampleAgent(request.headers.get("x-plan") === "pro" ? "pro-model" : "free-model", ["Be Acme support."]),
      }),
      waitUntil: (job) => {
        job.catch(() => undefined);
      },
      ownerFrom: () => ({ kind: "user", scopeId: "demo", userId: "ada" }),
    });

    await custom.request(
      "/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-plan": "pro", "x-run-id": crypto.randomUUID() },
        body: JSON.stringify({ content: "hi" }),
      },
      {},
      { waitUntil: () => undefined, passThroughOnException: () => undefined, props: {} },
    );

    expect(asked).toContain("pro-model");
    expect(asked).not.toContain("default-model");
  });
});
