// -----
// The words a person reads on Security status and on a repository's page, in one
// place so one edit changes them everywhere.
// -----
export const SUMMARY_COPY = {
  readMore: "Select a repository to read what is still open in it.",
  listLegend: "Medium and Low say how serious a problem is. Needs attention means something is still open.",
  noBranch: "A scan ran, but no branch is tracked yet, so no findings are listed. Ask a developer to add a branch to track.",
  notScanned: "Not scanned yet.",
  findingsTitle: "What is still open",
  findingsNext: "Next step: send this page to the developer who owns the repository. Fix the confirmed problems first.",
  findingsPrivate: "Each finding has its own link. Only people signed in to this account can open it. It describes a weakness, so keep it private.",
  findingsLegend: "Confirmed: the scan verified it. Needs a person to check: the scan could not, so look by hand.",
  nothingOpen: "Nothing is open.",
  loadFailed: "We could not load the findings for this repository. Check your connection and try again.",
  whereLabel: "Where in the code",
  impactLabel: "What could happen",
  fixLabel: "For your developer: how it gets fixed",
  needsLabel: "What a person needs to check",
  linkCopied: "Link copied. Only people signed in to this account can open it.",
  linkFailed: "We couldn't copy the link. Copy it from the address bar after you select the finding.",
} as const;
