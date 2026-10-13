import type { ChatBotCard } from "../types";
import { ChatBotToolCard } from "./chat-bot-tool-card";

type ChatBotToolCardsProps = {
  cards: ChatBotCard[];
};

export function ChatBotToolCards({ cards }: ChatBotToolCardsProps) {
  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-2">
      {cards.map((card) => (
        <ChatBotToolCard key={card.key} card={card} />
      ))}
    </div>
  );
}
