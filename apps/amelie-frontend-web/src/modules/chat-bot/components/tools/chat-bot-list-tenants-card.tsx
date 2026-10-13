import type { ListTenantsResult } from "@repo/contracts/chat-bots";
import type { ChatBotToolCardProps } from "./chat-bot-tool-registry";

export function ChatBotListTenantsCard({ result }: ChatBotToolCardProps<ListTenantsResult>) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {result.tenants.length === 0 && <li className="text-muted-foreground">No cafes to show.</li>}
      {result.tenants.map((tenant) => (
        <li key={tenant.slug} className="flex items-baseline justify-between gap-4 rounded-xl bg-accent px-4 py-3">
          <span className="font-medium">{tenant.name}</span>
          <span className="text-xs text-muted-foreground">{tenant.slug}</span>
        </li>
      ))}
    </ul>
  );
}
