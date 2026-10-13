import type { SetMenuItemsAvailabilityResult } from "@repo/contracts/chat-bots";
import { ChatBotAvailabilityTile } from "./chat-bot-availability-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotAvailabilityListCard({ result }: ChatBotToolCardProps<SetMenuItemsAvailabilityResult>) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {result.items.map((item) => (
        <ChatBotAvailabilityTile key={item.id} item={item} />
      ))}
      {result.notFound.length > 0 && (
        <p className="text-xs italic text-muted-foreground">
          {result.notFound.length === 1 ? "1 item" : `${result.notFound.length} items`} couldn't be found.
        </p>
      )}
    </div>
  );
}
