import { SCAN_SANDBOX_METER_EPSILON } from "#/modules/scan-sandbox/constants";
import type { Meter } from "#/modules/scan-sandbox/types";
import { priceUsage } from "#/modules/scan-sandbox/utils/price-usage";

// -----
// What a call can cost at most for its answer: every output token
// it may ask for, at the model's price. The proxy holds this much
// under the cap while the call runs.
// -----
export function reserveUsd(model: string, maxTokens: number): number {
  return priceUsage(model, { inputTokens: 0, outputTokens: maxTokens, cacheReadTokens: 0, cacheWriteTokens: 0 });
}

// -----
// The meter with a reserve added, or null when what is spent, what
// running calls hold and this reserve do not fit under the cap.
// -----
export function withReserve(meter: Meter, usd: number): Meter | null {
  const reservedUsd = meter.reservedUsd ?? 0;
  if (meter.spentUsd + reservedUsd + usd > meter.budgetUsd + SCAN_SANDBOX_METER_EPSILON) return null;
  return { ...meter, reservedUsd: reservedUsd + usd };
}

export function withoutReserve(meter: Meter, usd: number): Meter {
  return { ...meter, reservedUsd: Math.max(0, (meter.reservedUsd ?? 0) - usd) };
}
