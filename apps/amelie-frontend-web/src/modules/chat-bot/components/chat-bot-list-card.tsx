import { ChatBotListDisplayOptionsSchema } from "@repo/contracts/chat-bots";

import type { ChatBotCardLayoutProps } from "../types";
import { formatChatBotValue, toChatBotRow } from "../utils";
import { ChatBotCardFrame } from "./chat-bot-card-frame";
import { ChatBotKeyValueCard } from "./chat-bot-key-value-card";

// -----
// display = list: items from result[items]
// (or the result itself), labelled by a field.
// -----
export function ChatBotListCard({
  title,
  result,
  displayOptions,
}: ChatBotCardLayoutProps) {
  const options = ChatBotListDisplayOptionsSchema.safeParse(
    displayOptions ?? {},
  );
  const itemsKey = options.success ? options.data.items : undefined;
  const source = itemsKey ? toChatBotRow(result)?.[itemsKey] : result;
  const items = Array.isArray(source) ? source : [];
  if (items.length === 0) {
    return (
      <ChatBotKeyValueCard title={title} result={result} displayOptions={{}} />
    );
  }
  const label = options.success ? options.data.label : undefined;
  return (
    <ChatBotCardFrame title={title}>
      <ul className="flex flex-col gap-0.5 text-sm">
        {items.map((item, index) => {
          const row = toChatBotRow(item);
          return (
            <li key={index}>
              {formatChatBotValue(label && row ? row[label] : item)}
            </li>
          );
        })}
      </ul>
    </ChatBotCardFrame>
  );
}
