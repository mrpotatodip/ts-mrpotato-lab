import type { SetThreadCountryResult } from "@repo/contracts/chat-bots";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotSetThreadCountryCard({ result }: ChatBotToolCardProps<SetThreadCountryResult>) {
  return <ChatBotRowsTile rows={[{ label: "Country", value: `${result.country.name} (${result.country.code})` }]} />;
}
