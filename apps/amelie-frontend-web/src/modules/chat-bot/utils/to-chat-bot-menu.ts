import type { FindMenuItemsResult, MenuItemResult } from "@repo/contracts/chat-bots";

import type { ChatBotMenuGroup } from "../types";

function formatChatBotMenuPrice(price: string, currency: string | null): string {
  return currency ? `${price} ${currency}` : price;
}

export function toChatBotMenuItemPrice(item: Pick<MenuItemResult, "price" | "currency" | "variants">): string | null {
  if (item.variants && item.variants.length > 0) {
    return item.variants
      .map((variant) => `${variant.name} ${formatChatBotMenuPrice(variant.price, item.currency)}`)
      .join(" · ");
  }
  return item.price ? formatChatBotMenuPrice(item.price, item.currency) : null;
}

export function toChatBotMenuGroups(items: FindMenuItemsResult["items"]): ChatBotMenuGroup[] {
  const groups = new Map<string, ChatBotMenuGroup>();
  for (const item of items) {
    const group = groups.get(item.category);
    if (group) group.items.push(item);
    else groups.set(item.category, { category: item.category, note: item.categoryNote, items: [item] });
  }
  return [...groups.values()];
}
