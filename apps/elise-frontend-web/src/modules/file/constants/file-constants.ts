import type { FileName } from "../schemas";

export const FILE_LABELS = {
  "REPORT.md": { label: "Report", hint: "The written summary of the audit" },
  "FINDINGS-DETAIL.md": { label: "Finding details", hint: "Each finding, with its evidence" },
  "NEEDS-VALIDATION.md": { label: "Needs checking", hint: "Findings to check by hand" },
} as const satisfies Record<FileName, { label: string; hint: string }>;
