// -----
// Values of the branch dropdown that are not a branch name: the repository's
// own default, and "type the name yourself". The second holds a control
// character, so no real branch can have the same value.
// -----
export const SCAN_DEFAULT_BRANCH = "";
export const SCAN_OTHER_BRANCH = "\u0000other";

export const SCAN_PRIVATE_TRUNCATED = "Showing the first 100 branches. For any other, choose Other and type the exact name.";
export const SCAN_PRIVATE_BRANCH_FAILED = "We couldn't read this repository's branches. Check that the connection can still see it on the Connections page, or type the branch name below.";
