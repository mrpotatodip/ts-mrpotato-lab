import type { ChatBotBusinessProfileResult } from "../../schemas";
import { toChatBotProfileRows } from "../../utils";
import { ChatBotNeedsChoiceCard } from "./chat-bot-needs-choice-card";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotBusinessProfileCard({ result }: ChatBotToolCardProps<ChatBotBusinessProfileResult>) {
  const rows = toChatBotProfileRows(result);
  return (
    <div className="flex flex-col gap-3 text-sm">
      {result.note && <p className="text-xs italic text-muted-foreground">{result.note}</p>}
      {rows.length > 0 && <ChatBotRowsTile rows={rows} />}
      {rows.length === 0 && <p className="text-muted-foreground">No contact details are saved yet.</p>}
      {"needsLocation" in result && (
        <ChatBotNeedsChoiceCard message={result.message} options={result.locations.map((location) => location.name)} />
      )}
    </div>
  );
}
