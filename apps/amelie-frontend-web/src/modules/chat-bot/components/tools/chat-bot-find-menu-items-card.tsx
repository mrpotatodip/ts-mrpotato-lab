import type { FindMenuItemsResult } from "@repo/contracts/chat-bots";
import { toChatBotMenuGroups } from "../../utils";
import { ChatBotMenuItem } from "./chat-bot-menu-item";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotFindMenuItemsCard({ result }: ChatBotToolCardProps<FindMenuItemsResult>) {
  const where = [result.location?.name, result.country?.name].filter(Boolean).join(" · ");
  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto overscroll-contain pr-3 text-sm">
      {where && <p className="text-base text-muted-foreground">{where}</p>}
      {result.note && <p className="text-xs italic text-muted-foreground">{result.note}</p>}
      {result.items.length === 0 && <p className="text-muted-foreground">Sorry, I couldn't find anything on the menu that matches. Could you try different words?</p>}
      {toChatBotMenuGroups(result.items).map((group) => (
        <section key={group.category} className="flex flex-col gap-3">
          <div>
            <h4 className="text-base font-semibold">{group.category}</h4>
            {group.note && <p className="text-xs text-muted-foreground">{group.note}</p>}
          </div>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <ChatBotMenuItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
