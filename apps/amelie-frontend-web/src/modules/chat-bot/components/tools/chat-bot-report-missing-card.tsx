import type { ReportMissingInformationResult } from "@repo/contracts/chat-bots";
import { ChatBotRowsTile } from "./chat-bot-rows-tile";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotReportMissingCard({ result }: ChatBotToolCardProps<ReportMissingInformationResult>) {
  return (
    <ChatBotRowsTile rows={[{ label: "Passed on to the team", value: result.topic }]} />
  );
}
