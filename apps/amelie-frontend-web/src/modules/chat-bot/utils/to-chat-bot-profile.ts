import type { BusinessProfileResult } from "@repo/contracts/chat-bots";

import type { ChatBotProfileRow } from "../types";

const PROFILE_LABELS = [
  ["address", "Address"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["websiteUrl", "Website"],
  ["description", "About"],
] as const satisfies ReadonlyArray<readonly [keyof BusinessProfileResult, string]>;

const TENANT_PROFILE_LABELS = PROFILE_LABELS.filter(([key]) => key !== "address" && key !== "phone");

const toRows = (
  profile: BusinessProfileResult,
  labels: ReadonlyArray<readonly [keyof BusinessProfileResult, string]>,
): ChatBotProfileRow[] =>
  labels.flatMap(([key, label]) => {
    const value = profile[key];
    return value ? [{ label, value }] : [];
  });

export function toChatBotProfileRows(profile: BusinessProfileResult): ChatBotProfileRow[] {
  return toRows(profile, PROFILE_LABELS);
}

export function toChatBotTenantProfileRows(profile: BusinessProfileResult): ChatBotProfileRow[] {
  return toRows(profile, TENANT_PROFILE_LABELS);
}
