import type { ChatBotRemoveSpecialHoursResult } from "../../schemas";
import { toChatBotDateLabel } from "../../utils";
import { ChatBotNeedsChoiceCard } from "./chat-bot-needs-choice-card";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotSpecialHoursRemovedCard({ result }: ChatBotToolCardProps<ChatBotRemoveSpecialHoursResult>) {
  if ("needsLocation" in result) {
    return <ChatBotNeedsChoiceCard message={result.message} options={result.locations.map((location) => location.name)} />;
  }
  return (
    <ChatBotRowsTile rows={[{ label: "Special hours removed", value: toChatBotDateLabel(result.date) }]} />
  );
}
