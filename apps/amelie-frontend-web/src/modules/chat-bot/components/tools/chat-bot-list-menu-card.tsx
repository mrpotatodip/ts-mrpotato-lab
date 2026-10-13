import type { ListMenuResult } from "@repo/contracts/chat-bots";
import { ChatBotMenuItem } from "./chat-bot-menu-item";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotListMenuCard({ result }: ChatBotToolCardProps<ListMenuResult>) {
  const where = [result.location?.name, result.country?.name].filter(Boolean).join(" · ");
  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto overscroll-contain pr-3 text-sm">
      {where && <p className="text-base text-muted-foreground">{where}</p>}
      {result.note && <p className="text-xs italic text-muted-foreground">{result.note}</p>}
      {result.categories.length === 0 && <p className="text-muted-foreground">The menu is empty.</p>}
      {result.categories.map((category) => (
        <section key={category.id} className="flex flex-col gap-3">
          <div>
            <h4 className="text-base font-semibold">{category.name}</h4>
            {category.note && <p className="text-xs text-muted-foreground">{category.note}</p>}
          </div>
          <ul className="flex flex-col gap-2">
            {category.items.map((item) => (
              <ChatBotMenuItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
