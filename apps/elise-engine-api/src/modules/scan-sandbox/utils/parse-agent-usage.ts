import { z } from "zod";
import type { ScanUsage } from "@repo/contracts/elise";

const Count = z.number().int().min(0).catch(0);

// -----
// The final report of `claude --print --output-format json`.
// Every field is optional: a missing one counts as zero.
// -----
const AgentResultSchema = z.object({
  total_cost_usd: z.number().min(0).optional(),
  num_turns: z.number().int().min(0).optional(),
  duration_ms: z.number().int().min(0).optional(),
  usage: z
    .object({
      input_tokens: Count.optional(),
      output_tokens: Count.optional(),
      cache_read_input_tokens: Count.optional(),
      cache_creation_input_tokens: Count.optional(),
    })
    .optional(),
});

const parseResult = (text: string) => {
  try {
    return AgentResultSchema.safeParse(JSON.parse(text));
  } catch {
    return null;
  }
};

// -----
// The log holds one JSON object. A stray line before it
// is skipped: the last line that starts with "{" wins.
// -----
export const parseAgentUsage = (log: string): ScanUsage | null => {
  const lastObjectLine = log.trim().split("\n").findLast((line) => line.startsWith("{"));
  const parsed = parseResult(log.trim()) ?? (lastObjectLine ? parseResult(lastObjectLine) : null);
  if (!parsed?.success || (parsed.data.usage === undefined && parsed.data.total_cost_usd === undefined)) return null;
  const { usage, total_cost_usd, num_turns, duration_ms } = parsed.data;
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
    costUsd: total_cost_usd ?? 0,
    turns: num_turns ?? null,
    durationMs: duration_ms ?? null,
  };
};
