export const SCAN_STEP_COPY = {
  cloning: { label: "Cloning the repository", note: "Downloading the code to scan." },
  auditing: { label: "Reading the code for security issues", note: "This is the longest step." },
  saving: { label: "Saving the report", note: "Almost done." },
} as const;

export const SCAN_TRIAGE_COPY = {
  open: "Open: not decided yet",
  fixed: "Fixed",
  false_positive: "False positive",
  accepted_risk: "Accepted risk",
} as const;

export const SCAN_FINDING_STATE_COPY = {
  confirmed: { label: "Confirmed", note: "The agent verified this in the code." },
  needs_validation: { label: "Needs validation", note: "Likely, but a person should check before acting." },
  rejected: { label: "Rejected", note: "Checked and ruled out." },
} as const;
