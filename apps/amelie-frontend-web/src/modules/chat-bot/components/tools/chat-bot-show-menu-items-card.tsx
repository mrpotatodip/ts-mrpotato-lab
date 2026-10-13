import type { ShowMenuItemsResult } from "@repo/contracts/chat-bots";
import { toChatBotMenuItemPrice } from "../../utils";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotShowMenuItemsCard({ result }: ChatBotToolCardProps<ShowMenuItemsResult>) {
  if (result.items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      {result.items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 rounded-xl bg-accent px-4 py-1">
          {item.imageUrl && <img src={item.imageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />}
          <span className="min-w-0 flex-1 font-medium">{item.name}</span>
          <span className="shrink-0 text-right tabular-nums">{toChatBotMenuItemPrice(item)}</span>
        </li>
      ))}
    </ul>
  );
}
