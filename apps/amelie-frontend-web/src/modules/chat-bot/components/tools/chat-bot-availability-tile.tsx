import type { MenuItemPricingResult } from "@repo/contracts/chat-bots";
import { toChatBotMenuItemPrice } from "../../utils";

type ChatBotAvailabilityTileProps = {
  item: MenuItemPricingResult;
};

export function ChatBotAvailabilityTile({ item }: ChatBotAvailabilityTileProps) {
  const price = toChatBotMenuItemPrice(item);
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-accent px-4 py-3 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{item.name}</span>
        {price && <span className="text-xs text-muted-foreground tabular-nums">{price}</span>}
      </div>
      <span className="status-badge" data-status={item.isAvailable ? "success" : "neutral"}>
        {item.isAvailable ? "Available" : "Sold out"}
      </span>
    </div>
  );
}
