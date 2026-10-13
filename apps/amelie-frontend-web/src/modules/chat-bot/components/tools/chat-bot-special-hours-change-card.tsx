import type { ChatBotSpecialHoursChangeResult } from "../../schemas";
import { toChatBotDateLabel, toChatBotHoursText } from "../../utils";
import { ChatBotNeedsChoiceCard } from "./chat-bot-needs-choice-card";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotSpecialHoursChangeCard({ result }: ChatBotToolCardProps<ChatBotSpecialHoursChangeResult>) {
  if ("needsLocation" in result) {
    return <ChatBotNeedsChoiceCard message={result.message} options={result.locations.map((location) => location.name)} />;
  }
  return (
    <ChatBotRowsTile
      rows={[
        {
          label: toChatBotDateLabel(result.date),
          value: [toChatBotHoursText(result), result.note].filter(Boolean).join(" · "),
        },
      ]}
    />
  );
}
