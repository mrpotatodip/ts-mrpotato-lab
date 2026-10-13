import type { MenuItemPricingResult } from "@repo/contracts/chat-bots";
import { ChatBotAvailabilityTile } from "./chat-bot-availability-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotAvailabilityCard({ result }: ChatBotToolCardProps<MenuItemPricingResult>) {
  return <ChatBotAvailabilityTile item={result} />;
}
