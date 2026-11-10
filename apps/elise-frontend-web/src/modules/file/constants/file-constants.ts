import type { FileName } from "../schemas";

export const FILE_LABELS = {
  "REPORT.md": { label: "Report", hint: "The written summary of the audit" },
  "FINDINGS-DETAIL.md": { label: "Finding details", hint: "Each finding, with its evidence" },
  "NEEDS-VALIDATION.md": { label: "To check by hand", hint: "Findings a person should confirm; the scan could not decide" },
} as const satisfies Record<FileName, { label: string; hint: string }>;

export const FILE_ALL_HINT = "Every report your scans wrote.";
export const FILE_TIME_HINT = "Dates and times on this page are in UTC.";
