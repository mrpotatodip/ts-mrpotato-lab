import type { MenuItemResult } from "@repo/contracts/chat-bots";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { toChatBotMenuItemPrice } from "../../utils";

type ChatBotMenuItemProps = {
  item: MenuItemResult;
};

export function ChatBotMenuItem({ item }: ChatBotMenuItemProps) {
  const priceText = toChatBotMenuItemPrice(item);
  return (
    <li className={cn("grid grid-cols-[1fr_auto] gap-x-4 rounded-xl bg-accent px-4 py-1", !item.isAvailable && "text-muted-foreground")}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn("font-medium", !item.isAvailable && "line-through")}>{item.name}</span>
        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
        {item.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.dietaryTags.map((tag) => (
              <Badge key={tag} variant="outline" className="px-1.5 py-0 font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 text-right tabular-nums">
        <span>{item.isAvailable ? priceText : "Unavailable"}</span>
        {!item.isAvailable && priceText && <span className="text-xs">{priceText}</span>}
      </div>
    </li>
  );
}
