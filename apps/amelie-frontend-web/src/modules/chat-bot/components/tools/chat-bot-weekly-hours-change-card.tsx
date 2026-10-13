import type { ChatBotWeeklyHoursChangeResult } from "../../schemas";
import { toChatBotHoursText } from "../../utils";
import { ChatBotNeedsChoiceCard } from "./chat-bot-needs-choice-card";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotWeeklyHoursChangeCard({ result }: ChatBotToolCardProps<ChatBotWeeklyHoursChangeResult>) {
  if ("needsLocation" in result) {
    return <ChatBotNeedsChoiceCard message={result.message} options={result.locations.map((location) => location.name)} />;
  }
  return (
    <ChatBotRowsTile rows={[{ label: result.weekday, value: toChatBotHoursText(result) }]} />
  );
}
