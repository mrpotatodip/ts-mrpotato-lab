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

const toTokens = (usage: z.infer<typeof UsageSchema>, outputSoFar: number): MeteredTokens => ({
  inputTokens: usage.input_tokens ?? 0,
  outputTokens: Math.max(0, (usage.output_tokens ?? 0) - outputSoFar),
  cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
});

// -----
// Reads the usage out of a /v1/messages response as it streams
// by. The server-sent form reports input tokens in message_start
// and the running output total in message_delta; a plain JSON
// answer reports both at once. onUsage gets only what is new, so
// a client that hangs up halfway is still charged for what it saw.
// -----
export function createUsageScanner(onUsage: (tokens: MeteredTokens) => void) {
  let pending = "";
  let whole = "";
  let sawEvent = false;
  let outputSoFar = 0;

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
    const tokens = toTokens(usage, outputSoFar);
    outputSoFar += tokens.outputTokens;
    onUsage(tokens);
  };

  const readLine = (line: string) => {
    if (line.startsWith("data:")) readEvent(line.slice(5).trim());
  };

  return {
    feed(text: string) {
      whole += text;
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
      if (event.success && event.data.usage !== undefined) onUsage(toTokens(event.data.usage, 0));
    },
  };
}
