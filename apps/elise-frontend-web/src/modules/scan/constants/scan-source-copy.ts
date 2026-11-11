import type { ScanOption } from "./scan-option-copy";

export type ScanSource = "public" | "private";

export const SCAN_SOURCE_OPTIONS: readonly ScanOption<ScanSource>[] = [
  { value: "public", label: "Public repository", description: "Paste a link. No connection is needed." },
  { value: "private", label: "Private repository", description: "Choose from the repositories you connected on GitHub." },
];

// -----
// Values of the branch dropdown that are not a branch name: the repository's
// own default, and "type the name yourself". The second holds a control
// character, so no real branch can have the same value.
// -----
export const SCAN_DEFAULT_BRANCH = "";
export const SCAN_OTHER_BRANCH = "\u0000other";

export const SCAN_PUBLIC_HELP = "Paste the link to a public GitHub repository. For a private one, choose Private repository above.";
export const SCAN_PRIVATE_NONE_TITLE = "No GitHub connection yet";
export const SCAN_PRIVATE_NONE_BODY = "EliseLAB needs a GitHub connection to read a private repository. An admin of this account can connect it on the Connections page.";
export const SCAN_PRIVATE_EMPTY = "The connection has no repositories yet. Choose some on GitHub with Manage on the Connections page, then come back.";
export const SCAN_PRIVATE_REPO_HINT = "The repositories EliseLAB can read through your connection.";
export const SCAN_PRIVATE_TRUNCATED = "Showing the first 100 branches. For any other, choose Other and type the exact name.";
export const SCAN_PRIVATE_BRANCH_FAILED = "We couldn't read this repository's branches. Check that the connection can still see it on the Connections page, or type the branch name with Other.";
