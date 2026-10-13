import type { ChatBotOpeningScheduleResult } from "../../schemas";
import { toChatBotDateLabel, toChatBotHoursText } from "../../utils";
import { ChatBotNeedsChoiceCard } from "./chat-bot-needs-choice-card";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotOpeningScheduleCard({ result }: ChatBotToolCardProps<ChatBotOpeningScheduleResult>) {
  if ("needsLocation" in result) {
    return <ChatBotNeedsChoiceCard message={result.message} options={result.locations.map((location) => location.name)} />;
  }
  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto overscroll-contain pr-3 text-sm">
      <div className="flex flex-col gap-1">
        <p className="text-base">{result.location.name}</p>
        <p className="text-muted-foreground">{result.openNow}</p>
        {result.note && <p className="text-xs italic text-muted-foreground">{result.note}</p>}
      </div>
      <section className="flex flex-col gap-3">
        <h4 className="text-base font-semibold">Weekly hours</h4>
        <ChatBotRowsTile
          rows={result.weekly.map((day) => ({ label: day.weekday, value: toChatBotHoursText(day) }))}
        />
      </section>
      {result.specialDates.length > 0 && (
        <section className="flex flex-col gap-3">
          <h4 className="text-base font-semibold">Special dates</h4>
          <ChatBotRowsTile
            rows={result.specialDates.map((day) => ({
              label: toChatBotDateLabel(day.date),
              value: [toChatBotHoursText(day), day.note].filter(Boolean).join(" · "),
            }))}
          />
        </section>
      )}
    </div>
  );
}
