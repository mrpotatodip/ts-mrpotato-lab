import { ChatBotKeyValueDisplayOptionsSchema } from "@repo/contracts/chat-bots";

import type { ChatBotCardLayoutProps } from "../types";
import { formatChatBotValue, toChatBotLabel, toChatBotRow } from "../utils";
import { ChatBotCardFrame } from "./chat-bot-card-frame";

// -----
// display = key_value (and the generic
// fallback): one row per field.
// -----
export function ChatBotKeyValueCard({
  title,
  result,
  displayOptions,
}: ChatBotCardLayoutProps) {
  const row = toChatBotRow(result);
  if (!row) {
    return (
      <ChatBotCardFrame title={title}>
        <p className="text-sm">{formatChatBotValue(result)}</p>
      </ChatBotCardFrame>
    );
  }
  const options = ChatBotKeyValueDisplayOptionsSchema.safeParse(
    displayOptions ?? {},
  );
  const keys =
    (options.success ? options.data.fields : undefined) ?? Object.keys(row);
  return (
    <ChatBotCardFrame title={title}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {keys.map((key) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{toChatBotLabel(key)}</dt>
            <dd className="tabular-nums">{formatChatBotValue(row[key])}</dd>
          </div>
        ))}
      </dl>
    </ChatBotCardFrame>
  );
}
