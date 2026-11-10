const USD = new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const MONTH = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

export const usageUsd = (value: number) => USD.format(value);

const CHANGED_AT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

export const usageChangedAt = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : `${CHANGED_AT.format(date)} UTC`;
};

// -----
// null is the platform default, which is what an account is on
// until an admin sets its own budget.
// -----
export const usageBudgetLabel = (value: number | null) => (value === null ? "the default" : usageUsd(value));

export const usageTokens = (value: number) => COMPACT.format(value);

export const usageMonthLabel = (month: string) => {
  const date = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? month : MONTH.format(date);
};

export const usageCommittedPercent = (budgetUsd: number, spentUsd: number, reservedUsd: number) =>
  budgetUsd <= 0 ? 100 : Math.min(100, Math.round(((spentUsd + reservedUsd) / budgetUsd) * 100));

// -----
// The least an admin may set: what the month has already spent
// or holds for running scans, rounded up to the cent.
// -----
export const usageBudgetFloorUsd = (spentUsd: number, reservedUsd: number) => Math.ceil((spentUsd + reservedUsd) * 100) / 100;

// -----
// What the engine checks before it asks Anthropic: an API key
// starts with sk-ant- and is not a few characters long. Whether
// Anthropic accepts it only the engine can say.
// -----
export const anthropicKeyError = (input: string): string | undefined => {
  const text = input.trim();
  if (!text.startsWith("sk-ant-")) return "An Anthropic API key starts with sk-ant-.";
  if (text.length < 20 || text.length > 300) return "That does not look like a full API key. Copy the whole key.";
  return undefined;
};

const DOLLARS = /^\d{1,7}(\.\d{1,2})?$/;

// -----
// The same two rules the engine enforces, so the form says so
// before it sends. allowanceUsd is missing until the engine that
// reports it is live; the engine still refuses a value above it.
// -----
export const usageBudgetError = (input: string, floorUsd: number, allowanceUsd: number | undefined): string | undefined => {
  const text = input.trim();
  if (!DOLLARS.test(text)) return "Enter a dollar amount, like 25 or 25.50.";
  const value = Number(text);
  if (value < floorUsd) return `At least ${usageUsd(floorUsd)}: this month has already spent or holds that much.`;
  if (allowanceUsd !== undefined && value > allowanceUsd) return `At most ${usageUsd(allowanceUsd)}, the most this account may set.`;
  return undefined;
};
