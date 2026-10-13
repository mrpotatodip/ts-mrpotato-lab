import type { ComponentType } from "react";
import { isChatBotToolError } from "@repo/chat-bot/tools";
import type { ChatBotToolDisplay } from "@repo/contracts/chat-bots";
import type { ChatBotCard, ChatBotCardLayoutProps } from "../types";
import { chatBotToolTitle } from "../utils";
import { ChatBotErrorCard } from "./chat-bot-error-card";
import { ChatBotKeyValueCard } from "./chat-bot-key-value-card";
import { ChatBotListCard } from "./chat-bot-list-card";
import { ChatBotNumberCard } from "./chat-bot-number-card";
import { ChatBotTableCard } from "./chat-bot-table-card";
import { renderChatBotToolCard } from "./tools";

type ChatBotToolCardProps = {
  card: ChatBotCard;
};

const LAYOUTS = {
  number: ChatBotNumberCard,
  key_value: ChatBotKeyValueCard,
  table: ChatBotTableCard,
  list: ChatBotListCard,
} satisfies Record<ChatBotToolDisplay, ComponentType<ChatBotCardLayoutProps>>;

// -----
// Error card, then the tool's own card, then
// its display layout, then key/value.
// -----
export function ChatBotToolCard({ card }: ChatBotToolCardProps) {
  const title = chatBotToolTitle(card.tool);
  if (isChatBotToolError(card.result)) {
    return <ChatBotErrorCard title={title} message={card.result.error} />;
  }
  const custom = renderChatBotToolCard(card.tool, title, card.result);
  if (custom) return custom;
  const Layout = (card.display && LAYOUTS[card.display]) || ChatBotKeyValueCard;
  return (
    <Layout
      title={title}
      result={card.result}
      displayOptions={card.displayOptions}
    />
  );
}
