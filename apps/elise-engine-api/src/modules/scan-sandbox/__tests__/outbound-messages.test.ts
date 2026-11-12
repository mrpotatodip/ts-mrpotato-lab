import { afterEach, describe, expect, it, vi } from "vitest";
import { Outbound } from "#/modules/scan-sandbox";
import { messagesBlockedReason, safeBetaHeader, type MessagesBody } from "#/modules/scan-sandbox/utils";

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

const messages = (payload: MessagesBody, beta?: string) => {
  const sandbox = { meterAllows: async () => true, meterRecord: async () => undefined };
  const env = { ANTHROPIC_API_KEY: "platform-key", SANDBOX: { idFromString: () => "id", get: () => sandbox } };
  // SAFETY: the test stub of WorkerEntrypoint takes no arguments; env and ctx are set by hand.
  const instance = Reflect.construct(Outbound, []) as Outbound;
  Object.assign(instance, { env, ctx: { props: { sandboxId: "box", repo: "octo/hello" }, waitUntil: () => undefined } });
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
});
