import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import type { ChatBotJson } from "@repo/contracts/chat-bots";
import { CHAT_BOT_HTTP_MAX_RESPONSE_BYTES } from "../constants";
import { executeChatBotHttpTool } from "../http-executor";
import type { ChatBotToolSpec, ChatBotRuntime } from "../../lib";

function execute(...args: Parameters<typeof executeChatBotHttpTool>) {
  return Effect.runPromise(executeChatBotHttpTool(...args));
}

const spec: ChatBotToolSpec = {
  id: "tool-price",
  name: "getCardPrice",
  description: "Get a card price.",
  method: "GET",
  path: "/api-agent/prices/{{cardId}}",
  inputSchema: {
    type: "object",
    properties: { cardId: { type: "string" }, currency: { type: "string" } },
    required: ["cardId"],
    additionalProperties: false,
  },
  resultSchema: {
    type: "object",
    properties: { price: { type: "number" } },
    required: ["price"],
  },
  display: "number",
  displayOptions: { value: "price" },
  timeoutMs: null,
};

function runtime(response: Response): ChatBotRuntime {
  return {
    userId: "user-1",
    allowedPathPrefix: "/api-agent/",
    fetch: vi.fn<ChatBotRuntime["fetch"]>(async () => response),
  };
}

function json(body: ChatBotJson, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("executeChatBotHttpTool", () => {
  it("fills the path, adds the rest and userId as query, unwraps data", async () => {
    const rt = runtime(json({ data: { price: 42.5 }, error: null }));
    const result = await execute(
      spec,
      { cardId: "Kaido 058", currency: "NZD" },
      rt,
    );
    expect(result).toEqual({ price: 42.5 });
    const [path, init] = vi.mocked(rt.fetch).mock.calls[0]!;
    expect(path).toBe(
      "/api-agent/prices/Kaido%20058?currency=NZD&userId=user-1",
    );
    expect(init?.method).toBe("GET");
  });

  it("never lets the model override userId", async () => {
    const loose = { ...spec, inputSchema: { type: "object", properties: { cardId: { type: "string" }, userId: { type: "string" } }, required: ["cardId"] } };
    const rt = runtime(json({ price: 1 }));
    await execute(loose, { cardId: "c1", userId: "someone-else" }, rt);
    const [path] = vi.mocked(rt.fetch).mock.calls[0]!;
    expect(new URL(path, "http://x").searchParams.getAll("userId")).toEqual(["user-1"]);
  });

  it("rejects input that fails the row's schema", async () => {
    const rt = runtime(json({ price: 1 }));
    expect(await execute(spec, { cardId: 5 }, rt)).toEqual({
      error: "invalid input",
    });
    expect(rt.fetch).not.toHaveBeenCalled();
  });

  it("refuses paths outside the allowed prefix", async () => {
    for (const path of ["/admin/users", "/api-agent/../admin", "https://evil.test/api-agent/x", "//evil.test/api-agent/x"]) {
      const rt = runtime(json({ price: 1 }));
      expect(
        await execute({ ...spec, path }, { cardId: "c1" }, rt),
      ).toEqual({ error: "path not allowed" });
      expect(rt.fetch).not.toHaveBeenCalled();
    }
  });

  it("turns an encoded ../ in input into a harmless segment", async () => {
    const rt = runtime(json({ price: 1 }));
    await execute(spec, { cardId: "../../admin" }, rt);
    const [path] = vi.mocked(rt.fetch).mock.calls[0]!;
    expect(path.startsWith("/api-agent/prices/..%2F..%2Fadmin")).toBe(true);
  });

  it("times out", async () => {
    const rt: ChatBotRuntime = {
      userId: "user-1",
      allowedPathPrefix: "/api-agent/",
      fetch: vi.fn<ChatBotRuntime["fetch"]>(
        (_path: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      ),
    };
    expect(
      await execute({ ...spec, timeoutMs: 100 }, { cardId: "c1" }, rt),
    ).toEqual({ error: "timed out" });
  });

  it("rejects oversized responses", async () => {
    const big = JSON.stringify({ price: 1, pad: "x".repeat(CHAT_BOT_HTTP_MAX_RESPONSE_BYTES) });
    expect(
      await execute(spec, { cardId: "c1" }, runtime(new Response(big))),
    ).toEqual({ error: "response too large" });
  });

  it("reports envelope errors and HTTP failures", async () => {
    expect(
      await execute(
        spec,
        { cardId: "c1" },
        runtime(json({ data: null, error: { code: "NOT_FOUND", message: "Card not found" } }, 404)),
      ),
    ).toEqual({ error: "Card not found" });
    expect(
      await execute(spec, { cardId: "c1" }, runtime(json({ nope: true }, 500))),
    ).toEqual({ error: "endpoint returned 500" });
  });

  it("rejects a result that fails the row's result schema", async () => {
    expect(
      await execute(spec, { cardId: "c1" }, runtime(json({ price: "cheap" }))),
    ).toEqual({ error: "unexpected response" });
  });

  it("sends a JSON body for POST", async () => {
    const rt = runtime(json({ price: 2 }));
    await execute(
      { ...spec, method: "POST", path: "/api-agent/prices" },
      { cardId: "c1" },
      rt,
    );
    const [path, init] = vi.mocked(rt.fetch).mock.calls[0]!;
    expect(path).toBe("/api-agent/prices?userId=user-1");
    expect(init?.body).toBe(JSON.stringify({ cardId: "c1" }));
  });
});
