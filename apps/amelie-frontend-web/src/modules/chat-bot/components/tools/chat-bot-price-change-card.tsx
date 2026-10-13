import type { ChatBotPriceChangeResult } from "../../schemas";
import { toChatBotMenuItemPrice } from "../../utils";
import { ChatBotNeedsChoiceCard } from "./chat-bot-needs-choice-card";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotPriceChangeCard({ result }: ChatBotToolCardProps<ChatBotPriceChangeResult>) {
  if ("needsCountry" in result) {
    return <ChatBotNeedsChoiceCard message={result.message} options={result.countries.map((country) => country.name)} />;
  }
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-xl bg-accent px-4 py-3 text-sm">
      <span className="font-medium">{result.name}</span>
      <span className="text-right tabular-nums">{toChatBotMenuItemPrice(result)}</span>
    </div>
  );
}
