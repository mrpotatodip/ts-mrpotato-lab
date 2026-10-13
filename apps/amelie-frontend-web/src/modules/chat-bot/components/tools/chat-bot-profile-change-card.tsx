import type { BusinessProfileResult } from "@repo/contracts/chat-bots";
import { toChatBotProfileRows } from "../../utils";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotProfileChangeCard({ result }: ChatBotToolCardProps<BusinessProfileResult>) {
  return (
    <ChatBotRowsTile rows={toChatBotProfileRows(result)} />
  );
}
