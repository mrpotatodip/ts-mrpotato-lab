import { ACCEPTED_RISK_MAX_DAYS } from "@repo/contracts/elise";

export const FINDING_ACCEPT_DAYS_DEFAULT = 30;

export const FINDING_ACCEPT_DAYS_OPTIONS = [7, 14, 30, 60, ACCEPTED_RISK_MAX_DAYS].map((days) => ({ value: String(days), label: `${days} days` }));
