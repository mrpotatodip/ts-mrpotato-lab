import { z } from "zod";
import type { MeteredTokens } from "#/modules/scan-sandbox/types";

const Count = z.number().int().min(0).catch(0);
const UsageSchema = z.object({
  input_tokens: Count.optional(),
  output_tokens: Count.optional(),
  cache_read_input_tokens: Count.optional(),
  cache_creation_input_tokens: Count.optional(),
});
const EventSchema = z.object({
  type: z.string().optional(),
  message: z.object({ usage: UsageSchema.optional() }).optional(),
  usage: UsageSchema.optional(),
});

const NOTHING_YET: MeteredTokens = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

// -----
// What a usage block adds to the totals already seen. Every count
// in a block is a running total, so a message_delta that repeats
// the input or cache counts of message_start adds nothing.
// -----
const toNewTokens = (usage: z.infer<typeof UsageSchema>, soFar: MeteredTokens): MeteredTokens => ({
  inputTokens: Math.max(0, (usage.input_tokens ?? 0) - soFar.inputTokens),
  outputTokens: Math.max(0, (usage.output_tokens ?? 0) - soFar.outputTokens),
  cacheReadTokens: Math.max(0, (usage.cache_read_input_tokens ?? 0) - soFar.cacheReadTokens),
  cacheWriteTokens: Math.max(0, (usage.cache_creation_input_tokens ?? 0) - soFar.cacheWriteTokens),
});

const sumTokens = (a: MeteredTokens, b: MeteredTokens): MeteredTokens => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
});

// -----
// Reads the usage out of a /v1/messages response as it streams
// by. The server-sent form reports input tokens in message_start
// and the running totals in message_delta; a plain JSON answer
// reports them all at once. onUsage gets only what is new, so
// a client that hangs up halfway is still charged for what it saw.
// The body is kept only until the first event proves it is a
// stream: a plain JSON answer is read whole, a stream line by line.
// -----
export function createUsageScanner(onUsage: (tokens: MeteredTokens) => void) {
  let pending = "";
  let whole = "";
  let sawEvent = false;
  let soFar = NOTHING_YET;

  const readEvent = (json: string) => {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      return;
    }
    const event = EventSchema.safeParse(raw);
    if (!event.success) return;
    const usage = event.data.type === "message_start" ? event.data.message?.usage : event.data.type === "message_delta" ? event.data.usage : undefined;
    if (usage === undefined) return;
    sawEvent = true;
    whole = "";
    const tokens = toNewTokens(usage, soFar);
    soFar = sumTokens(soFar, tokens);
    onUsage(tokens);
  };

  const readLine = (line: string) => {
    if (line.startsWith("data:")) readEvent(line.slice(5).trim());
  };

  return {
    feed(text: string) {
      if (!sawEvent) whole += text;
      pending += text;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      lines.forEach(readLine);
    },
    end() {
      readLine(pending);
      if (sawEvent) return;
      let raw: unknown;
      try {
        raw = JSON.parse(whole);
      } catch {
        return;
      }
      const event = EventSchema.safeParse(raw);
      if (event.success && event.data.usage !== undefined) onUsage(toNewTokens(event.data.usage, NOTHING_YET));
    },
  };
}
