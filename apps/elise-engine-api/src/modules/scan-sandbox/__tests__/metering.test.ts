import { describe, expect, it } from "vitest";
import type { MeteredTokens } from "#/modules/scan-sandbox/types";
import { createUsageScanner, priceUsage } from "#/modules/scan-sandbox/utils";

const scan = (chunks: string[]) => {
  const seen: MeteredTokens[] = [];
  const scanner = createUsageScanner((tokens) => seen.push(tokens));
  chunks.forEach((chunk) => scanner.feed(chunk));
  scanner.end();
  return seen;
};

const start = { type: "message_start", message: { usage: { input_tokens: 100, output_tokens: 1, cache_read_input_tokens: 50, cache_creation_input_tokens: 10 } } };
const delta = { type: "message_delta", usage: { output_tokens: 40 } };
const sse = (event: typeof start | typeof delta) => `event: x\ndata: ${JSON.stringify(event)}\n\n`;

describe("createUsageScanner", () => {
  it("reports input at message_start and only the new output at message_delta", () => {
    expect(scan([sse(start), sse(delta)])).toEqual([
      { inputTokens: 100, outputTokens: 1, cacheReadTokens: 50, cacheWriteTokens: 10 },
      { inputTokens: 0, outputTokens: 39, cacheReadTokens: 0, cacheWriteTokens: 0 },
    ]);
  });

  it("counts input and cache once when message_delta repeats their running totals", () => {
    const final = { type: "message_delta", usage: { input_tokens: 100, output_tokens: 40, cache_read_input_tokens: 50, cache_creation_input_tokens: 10 } };
    const tokens = scan([sse(start), `data: ${JSON.stringify(final)}\n\n`]);

    expect(tokens[1]).toEqual({ inputTokens: 0, outputTokens: 39, cacheReadTokens: 0, cacheWriteTokens: 0 });
  });

  it("finds events split across chunks", () => {
    const text = sse(start);
    expect(scan([text.slice(0, 30), text.slice(30)])).toHaveLength(1);
  });

  it("charges what it saw when the stream stops after message_start", () => {
    expect(scan([sse(start)])).toHaveLength(1);
  });

  it("reads a plain JSON answer", () => {
    const body = JSON.stringify({ usage: { input_tokens: 7, output_tokens: 3 } });
    expect(scan([body])).toEqual([{ inputTokens: 7, outputTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 0 }]);
  });
});

describe("priceUsage", () => {
  const tokens = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 };

  it("prices a listed model by its own rates", () => {
    expect(priceUsage("claude-sonnet-5-5", tokens)).toBeCloseTo(12.2);
  });

  it("prices an unlisted model like the dearest one", () => {
    expect(priceUsage("claude-mystery", tokens)).toBeCloseTo(60.25);
  });
});
