import type { Settlement, SettlementInput } from "#/modules/credit/types";

// -----
// The ledger keeps four decimals, so every amount is rounded to
// four before it is added, compared or stored.
// -----
export const roundUsd = (usd: number): number => Math.round(usd * 10_000) / 10_000;

// -----
// The credit a scan takes: what it cost, times the plan's markup.
// The hold is the same rule on the scan's budget cap, the most the
// scan may cost.
// -----
export const chargeOf = (costUsd: number, markup: number): number => roundUsd(costUsd * markup);
export const holdOf = (maxBudgetUsd: number, markup: number): number => roundUsd(maxBudgetUsd * markup);

// -----
// The credit a paid period adds. The balance after is the larger of
// the balance now and the smaller of balance plus grant and the cap,
// so a grant never pushes past the cap and never takes credit away.
// A plan with no cap adds the whole grant.
// -----
export const renewalGrantOf = (balanceUsd: number, grantUsd: number, capUsd: number | null): number =>
  capUsd === null ? grantUsd : roundUsd(Math.max(0, Math.min(grantUsd, capUsd - balanceUsd)));

// -----
// The charge when a scan ends. A failed scan the meter never read
// spent nothing, so it is free and its hold comes back whole. A
// succeeded scan with no cost is refused.
// -----
export const settlementOf = ({ status, costUsd, markup }: SettlementInput): Settlement => {
  if (costUsd !== null) return { ok: true, chargeUsd: chargeOf(costUsd, markup) };
  return status === "failed" ? { ok: true, chargeUsd: 0 } : { ok: false, reason: "missing_cost" };
};
