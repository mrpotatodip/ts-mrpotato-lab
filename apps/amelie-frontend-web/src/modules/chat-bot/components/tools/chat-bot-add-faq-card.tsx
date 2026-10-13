import type { ChatBotFaqChangeResult } from "../../schemas";
import { ChatBotFaqItem } from "./chat-bot-faq-item";
import { ChatBotNeedsChoiceCard } from "./chat-bot-needs-choice-card";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotAddFaqCard({ result }: ChatBotToolCardProps<ChatBotFaqChangeResult>) {
  if ("needsScope" in result) {
    return (
      <ChatBotNeedsChoiceCard
        message={result.message}
        options={[...result.countries.map((country) => country.name), ...result.locations.map((location) => location.name)]}
      />
    );
  }
  return (
    <ul>
      <ChatBotFaqItem faq={result} />
    </ul>
  );
}
