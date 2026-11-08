const USD = new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const MONTH = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

export const usageUsd = (value: number) => USD.format(value);

export const usageTokens = (value: number) => COMPACT.format(value);

export const usageMonthLabel = (month: string) => {
  const date = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? month : MONTH.format(date);
};

export const usageCommittedPercent = (budgetUsd: number, spentUsd: number, reservedUsd: number) =>
  budgetUsd <= 0 ? 100 : Math.min(100, Math.round(((spentUsd + reservedUsd) / budgetUsd) * 100));
