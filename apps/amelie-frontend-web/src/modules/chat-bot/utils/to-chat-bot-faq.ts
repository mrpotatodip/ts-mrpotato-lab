import type { FaqResult } from "@repo/contracts/chat-bots";

import type { ChatBotFaqGroup } from "../types";

const UNCATEGORISED = "General";

export function toChatBotFaqGroups(faqs: FaqResult[]): ChatBotFaqGroup[] {
  const groups = new Map<string, ChatBotFaqGroup>();
  for (const faq of faqs) {
    const category = faq.category ?? UNCATEGORISED;
    const group = groups.get(category);
    if (group) group.faqs.push(faq);
    else groups.set(category, { category, faqs: [faq] });
  }
  return [...groups.values()];
}
