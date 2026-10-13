import type { MenuCategoryResult } from "@repo/contracts/chat-bots";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotAddMenuCategoryCard({ result }: ChatBotToolCardProps<MenuCategoryResult>) {
  return (
    <ChatBotRowsTile
      rows={[
        { label: "Category", value: result.name },
        ...(result.note ? [{ label: "Note", value: result.note }] : []),
      ]}
    />
  );
}
