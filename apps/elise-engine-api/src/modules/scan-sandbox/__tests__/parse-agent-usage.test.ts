import { describe, expect, it } from "vitest";
import { parseAgentUsage } from "#/modules/scan-sandbox/utils";

const result = {
  type: "result",
  subtype: "success",
  is_error: false,
  duration_ms: 91000,
  num_turns: 14,
  total_cost_usd: 0.4132,
  usage: { input_tokens: 1200, output_tokens: 5400, cache_read_input_tokens: 250000, cache_creation_input_tokens: 31000 },
};

describe("parseAgentUsage", () => {
  it("reads tokens, cost, turns and duration from the agent's report", () => {
    expect(parseAgentUsage(JSON.stringify(result))).toEqual({
      inputTokens: 1200,
      outputTokens: 5400,
      cacheReadTokens: 250000,
      cacheWriteTokens: 31000,
      costUsd: 0.4132,
      turns: 14,
      durationMs: 91000,
    });
  });

  it("skips a stray line before the report", () => {
    expect(parseAgentUsage(`warning: something\n${JSON.stringify(result)}\n`)?.outputTokens).toBe(5400);
  });

  it("counts a missing token field as zero", () => {
    expect(parseAgentUsage(JSON.stringify({ total_cost_usd: 0.1, usage: { output_tokens: 7 } }))).toMatchObject({
      inputTokens: 0,
      outputTokens: 7,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      turns: null,
    });
  });

  it.each(["", "not json", "{}", "[]", '{"result":"done"}'])("returns null for %j", (log) => {
    expect(parseAgentUsage(log)).toBeNull();
  });
});
