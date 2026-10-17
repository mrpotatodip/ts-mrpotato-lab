import { ADMIN_ROLE_KEY_MAX, ADMIN_ROLE_KEY_PATTERN } from "@repo/contracts/amelie";

// -----
// A key suggestion from the label: lower case, words
// joined by underscores, never starting with a digit.
// -----
export function toAdminRoleKey(label: string): string {
  const words = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const key = /^[0-9]/.test(words) ? `role_${words}` : words;
  return key.slice(0, ADMIN_ROLE_KEY_MAX).replace(/_+$/, "");
}

export function isAdminRoleKey(key: string): boolean {
  return ADMIN_ROLE_KEY_PATTERN.test(key);
}
