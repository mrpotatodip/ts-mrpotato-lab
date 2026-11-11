import { SCAN_SANDBOX_DEFAULT_PRICE, SCAN_SANDBOX_MODEL_PRICES } from "#/modules/scan-sandbox/constants";
import type { MeteredTokens } from "#/modules/scan-sandbox/types";

const priceOf = (model: string) => new Map(Object.entries(SCAN_SANDBOX_MODEL_PRICES)).get(model) ?? SCAN_SANDBOX_DEFAULT_PRICE;

export function priceUsage(model: string, tokens: MeteredTokens): number {
  const price = priceOf(model);
  return (
    (tokens.inputTokens * price.input +
      tokens.outputTokens * price.output +
      tokens.cacheReadTokens * price.cacheRead +
      tokens.cacheWriteTokens * price.cacheWrite) /
    1_000_000
  );
}
