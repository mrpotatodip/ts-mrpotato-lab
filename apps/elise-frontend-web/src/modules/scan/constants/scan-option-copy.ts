import type { CreateScanInput } from "../schemas";

export type ScanOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

export const SCAN_SKILL_OPTIONS: readonly ScanOption<CreateScanInput["skill"]>[] = [
  {
    value: "lite",
    label: "Quick review",
    description: "A fast first look for common security mistakes. Good for small projects or a quick check.",
  },
  {
    value: "full",
    label: "Full audit",
    description: "A deeper, multi-step review where every confirmed finding is independently verified. Takes longer and uses more budget.",
  },
];

export const SCAN_PROFILE_OPTIONS: readonly ScanOption<CreateScanInput["profile"]>[] = [
  {
    value: "quick",
    label: "Focused",
    description: "One bounded pass. Best for small projects, re-runs, or a fast first look.",
  },
  {
    value: "standard",
    label: "Balanced",
    description: "Recommended for most repositories. Good coverage without the longest run time.",
  },
  {
    value: "deep",
    label: "Exhaustive",
    description: "The widest coverage and the most cross-checking. Slowest and most expensive.",
  },
];

export const SCAN_MODEL_OPTIONS: readonly ScanOption<CreateScanInput["model"]>[] = [
  { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", description: "Balanced speed and quality. The default." },
  { value: "claude-opus-5-5", label: "Claude Opus 5.5", description: "Most capable and thorough, but slower." },
  { value: "claude-haiku-5-5", label: "Claude Haiku 5.5", description: "Fastest and lowest cost, with a lighter touch." },
];

export const SCAN_EFFORT_OPTIONS: readonly ScanOption<CreateScanInput["effort"]>[] = [
  { value: "low", label: "Low", description: "Quickest, shallowest look." },
  { value: "medium", label: "Medium", description: "Lighter than the default." },
  { value: "high", label: "High", description: "Recommended balance of depth and time." },
  { value: "xhigh", label: "Extra high", description: "Digs deeper and takes noticeably longer." },
  { value: "max", label: "Maximum", description: "Most thorough. Slowest and most expensive." },
];
