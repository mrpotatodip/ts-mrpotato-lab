import type { ListFaqsResult } from "@repo/contracts/chat-bots";
import { toChatBotFaqGroups } from "../../utils";
import { ChatBotFaqItem } from "./chat-bot-faq-item";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotListFaqsCard({ result }: ChatBotToolCardProps<ListFaqsResult>) {
  const where = [result.location?.name, result.country?.name].filter(Boolean).join(" · ");
  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto overscroll-contain pr-3 text-sm">
      {where && <p className="text-base text-muted-foreground">{where}</p>}
      {result.note && <p className="text-xs italic text-muted-foreground">{result.note}</p>}
      {result.faqs.length === 0 && <p className="text-muted-foreground">There are no FAQs here yet.</p>}
      {toChatBotFaqGroups(result.faqs).map((group) => (
        <section key={group.category} className="flex flex-col gap-3">
          <h4 className="text-base font-semibold">{group.category}</h4>
          <ul className="flex flex-col gap-2">
            {group.faqs.map((faq) => (
              <ChatBotFaqItem key={faq.id} faq={faq} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
