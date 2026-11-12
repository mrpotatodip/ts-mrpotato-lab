import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScanPath } from "#/lib/scan-path";
import { Outbound } from "#/modules/scan-sandbox";
import type { Meter, MeteredTokens } from "#/modules/scan-sandbox/types";
import { messagesBlockedReason, priceUsage, safeBetaHeader, withReserve, withoutReserve, type MessagesBody } from "#/modules/scan-sandbox/utils";

const body = (extra: Partial<MessagesBody> = {}): MessagesBody => ({ model: "claude-haiku-5-5", ...extra });

describe("messagesBlockedReason", () => {
  it.each([
    ["no tools", {}],
    ["the agent's own tools, with no type", { tools: [{ name: "Bash" }, { name: "Read" }] }],
    ["a custom tool", { tools: [{ type: "custom", name: "x" }] }],
    ["a tool Anthropic defines and the agent runs", { tools: [{ type: "bash_20250124", name: "bash" }, { type: "text_editor_20250728", name: "e" }] }],
  ])("lets through %s", (_label, extra) => {
    expect(messagesBlockedReason(body(extra))).toBeNull();
  });

  it.each([
    ["a remote MCP server", { mcp_servers: [{ type: "url", url: "https://attacker.example/mcp", name: "x" }] }, "mcp_servers is not allowed"],
    ["the web fetch tool", { tools: [{ type: "web_fetch_20250910", name: "web_fetch" }] }, "the web_fetch_20250910 tool is not allowed"],
    ["the web search tool", { tools: [{ name: "Read" }, { type: "web_search_20250305", name: "web_search" }] }, "the web_search_20250305 tool is not allowed"],
    ["the code execution tool", { tools: [{ type: "code_execution_20250522", name: "code_execution" }] }, "the code_execution_20250522 tool is not allowed"],
  ])("refuses %s, which reaches the network from Anthropic's side", (_label, extra, reason) => {
    expect(messagesBlockedReason(body(extra))).toBe(reason);
  });
});

describe("safeBetaHeader", () => {
  it.each([
    ["no header", null, null],
    ["betas the agent needs", "claude-code-20250219, interleaved-thinking-2025-05-14", "claude-code-20250219,interleaved-thinking-2025-05-14"],
    ["a risky beta among safe ones", "claude-code-20250219,mcp-client-2025-04-04,web-fetch-2025-09-10", "claude-code-20250219"],
    ["only risky betas", "code-execution-2025-05-22,files-api-2025-04-14,skills-2025-10-02", null],
  ])("keeps %s as expected", (_label, header, expected) => {
    expect(safeBetaHeader(header)).toBe(expected);
  });
});

type Sent = { headers: Headers; body: string };

const stubAnthropic = () => {
  const sent: Sent[] = [];
  vi.stubGlobal("fetch", async (input: Request) => {
    sent.push({ headers: input.headers, body: await input.text() });
    return Response.json({ usage: { input_tokens: 1, output_tokens: 1 } });
  });
  return sent;
};

type FakeSandbox = {
  meterReserve: (usd: number) => Promise<boolean>;
  meterRelease: (usd: number) => Promise<void>;
  meterRecord: (model: string, tokens: MeteredTokens) => Promise<void>;
};
const openSandbox: FakeSandbox = { meterReserve: async () => true, meterRelease: async () => undefined, meterRecord: async () => undefined };

// -----
// A sandbox whose meter is the real reserve logic over a value in memory
// -----
const meterSandbox = (budgetUsd: number) => {
  let meter: Meter = { budgetUsd, spentUsd: 0, reservedUsd: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  return {
    read: () => meter,
    meterReserve: async (usd: number) => {
      const next = withReserve(meter, usd);
      if (next !== null) meter = next;
      return next !== null;
    },
    meterRelease: async (usd: number) => {
      meter = withoutReserve(meter, usd);
    },
    meterRecord: async (model: string, tokens: MeteredTokens) => {
      meter = { ...meter, spentUsd: meter.spentUsd + priceUsage(model, tokens) };
    },
  };
};

const messages = (payload: MessagesBody, beta?: string, sandbox: FakeSandbox = openSandbox, pending: Promise<unknown>[] = [], path?: ScanPath) => {
  const env = {
    ANTHROPIC_API_KEY: "platform-key",
    SANDBOX: { idFromString: () => "id", get: () => sandbox },
    SANDBOX_FULL: { idFromString: () => "full-id", get: () => openSandbox },
  };
  // SAFETY: the test stub of WorkerEntrypoint takes no arguments; env and ctx are set by hand.
  const instance = Reflect.construct(Outbound, []) as Outbound;
  Object.assign(instance, { env, ctx: { props: { sandboxId: "box", repo: "octo/hello", path }, waitUntil: (work: Promise<unknown>) => pending.push(work) } });
  const headers = new Headers({ "content-type": "application/json", "x-api-key": "placeholder" });
  if (beta !== undefined) headers.set("anthropic-beta", beta);
  return instance.fetch(new Request("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(payload) }));
};

afterEach(() => vi.unstubAllGlobals());

describe("Outbound, a model call", () => {
  it("refuses a call that asks Anthropic to fetch a URL, and sends nothing upstream", async () => {
    const sent = stubAnthropic();
    const response = await messages({ model: "claude-haiku-5-5", messages: [], tools: [{ type: "web_fetch_20250910", name: "web_fetch" }] });
    expect(response.status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("sends an ordinary call on with the account's key and only the safe betas", async () => {
    const sent = stubAnthropic();
    const response = await messages({ model: "claude-haiku-5-5", messages: [], tools: [{ name: "Read" }] }, "claude-code-20250219,mcp-client-2025-04-04");
    expect(response.status).toBe(200);
    expect(sent[0]?.headers.get("x-api-key")).toBe("platform-key");
    expect(sent[0]?.headers.get("anthropic-beta")).toBe("claude-code-20250219");
  });

  // -----
  // The meter lives in the Sandbox of the path the Scan runs on. The lite
  // namespace here refuses every call and the full one allows it, so a 200
  // shows which namespace Outbound asked. A Scan with no path is lite.
  // -----
  it.each([
    ["a full Scan", "full" as const, 200],
    ["a lite Scan", "lite" as const, 403],
    ["a Scan that started before there were two paths", undefined, 403],
  ])("asks the Sandbox namespace of its path: %s", async (_label, path, status) => {
    stubAnthropic();
    const refusing: FakeSandbox = { ...openSandbox, meterReserve: async () => false };
    const response = await messages({ model: "claude-haiku-5-5", messages: [] }, undefined, refusing, [], path);
    expect(response.status).toBe(status);
  });
});

// -----
// Haiku, 10000 tokens asked: a call reserves $0.025 and, as the stub
// answers, spends $0.0025 of it.
// -----
describe("Outbound, the budget cap with calls in parallel", () => {
  const call = { model: "claude-haiku-5-5", messages: [], max_tokens: 10_000 };
  const answered = { usage: { input_tokens: 0, output_tokens: 1000 } };

  const stubSlowAnthropic = () => {
    const { promise: gate, resolve: open } = Promise.withResolvers<void>();
    const upstream = vi.fn<() => Promise<Response>>(async () => {
      await gate;
      return Response.json(answered);
    });
    vi.stubGlobal("fetch", upstream);
    return { open, upstream };
  };

  it("refuses the calls whose reserves do not fit while others run, and the spend stays under the cap", async () => {
    const { open, upstream } = stubSlowAnthropic();
    const sandbox = meterSandbox(0.06);
    const pending: Promise<unknown>[] = [];
    const inFlight = Array.from({ length: 5 }, () => messages(call, undefined, sandbox, pending));
    await vi.waitFor(() => expect(upstream).toHaveBeenCalledTimes(2));
    open();
    const responses = await Promise.all(inFlight);
    await Promise.all(responses.map((response) => response.text()));
    await Promise.all(pending);

    expect(responses.map((response) => response.status).toSorted()).toEqual([200, 200, 403, 403, 403]);
    expect(sandbox.read().spentUsd).toBeCloseTo(0.005);
    expect(sandbox.read().reservedUsd).toBeCloseTo(0);
  });

  it("does not refuse calls that come one after another while the cap has room for each", async () => {
    stubSlowAnthropic().open();
    const sandbox = meterSandbox(0.05);
    const statuses: number[] = [];
    const pending: Promise<unknown>[] = [];
    for (let turn = 0; turn < 5; turn++) {
      const response = await messages(call, undefined, sandbox, pending);
      await response.text();
      await Promise.all(pending);
      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200]);
  });

  it("gives the reserve back when the upstream call fails", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "overloaded" }, { status: 529 }));
    const sandbox = meterSandbox(0.03);
    const pending: Promise<unknown>[] = [];
    await messages(call, undefined, sandbox, pending);
    await messages(call, undefined, sandbox, pending);
    await Promise.all(pending);

    expect(sandbox.read().reservedUsd).toBeCloseTo(0);
  });

  it("tells the agent why a call was refused", async () => {
    const response = await messages(call, undefined, meterSandbox(0.01));
    expect(await response.text()).toContain("the scan's budget is spent");
  });
});
