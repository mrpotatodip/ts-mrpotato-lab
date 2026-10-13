import type { SetThreadLocationResult } from "@repo/contracts/chat-bots";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotSetThreadLocationCard({ result }: ChatBotToolCardProps<SetThreadLocationResult>) {
  return <ChatBotRowsTile rows={[{ label: "Location", value: result.location.name }]} />;
}
