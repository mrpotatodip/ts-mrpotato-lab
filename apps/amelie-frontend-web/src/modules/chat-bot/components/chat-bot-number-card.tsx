import { ChatBotNumberDisplayOptionsSchema } from "@repo/contracts/chat-bots";

import type { ChatBotCardLayoutProps } from "../types";
import { formatChatBotValue, toChatBotRow } from "../utils";
import { ChatBotCardFrame } from "./chat-bot-card-frame";
import { ChatBotKeyValueCard } from "./chat-bot-key-value-card";

// -----
// display = number: one big value, e.g.
// { value: "price", unit: "currency" }.
// -----
export function ChatBotNumberCard({
  title,
  result,
  displayOptions,
}: ChatBotCardLayoutProps) {
  const options = ChatBotNumberDisplayOptionsSchema.safeParse(displayOptions);
  const row = toChatBotRow(result);
  if (!options.success || !row) {
    return (
      <ChatBotKeyValueCard title={title} result={result} displayOptions={{}} />
    );
  }
  const { value, unit, label } = options.data;
  return (
    <ChatBotCardFrame title={label ? formatChatBotValue(row[label]) : title}>
      <p className="text-lg font-semibold tabular-nums">
        {formatChatBotValue(row[value])}
        {unit ? (
          <span className="ml-1 text-sm font-normal">
            {formatChatBotValue(row[unit])}
          </span>
        ) : null}
      </p>
    </ChatBotCardFrame>
  );
}
