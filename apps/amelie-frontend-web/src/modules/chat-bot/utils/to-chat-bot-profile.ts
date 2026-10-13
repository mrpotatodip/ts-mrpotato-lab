import type { BusinessProfileResult } from "@repo/contracts/chat-bots";

import type { ChatBotProfileRow } from "../types";

const PROFILE_LABELS = [
  ["address", "Address"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["websiteUrl", "Website"],
  ["description", "About"],
] as const satisfies ReadonlyArray<readonly [keyof BusinessProfileResult, string]>;

export function toChatBotProfileRows(profile: BusinessProfileResult): ChatBotProfileRow[] {
  return PROFILE_LABELS.flatMap(([key, label]) => {
    const value = profile[key];
    return value ? [{ label, value }] : [];
  });
}
