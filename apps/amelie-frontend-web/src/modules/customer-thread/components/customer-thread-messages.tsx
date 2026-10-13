import type { CustomerThreadMessage } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { LocalDateTime } from "#/modules/shared";

type CustomerThreadMessagesProps = {
  messages: CustomerThreadMessage[];
};

// -----
// The messages of one chat, read-only: the Customer on
// one side, the assistant on the other.
// -----
export function CustomerThreadMessages({ messages }: CustomerThreadMessagesProps) {
  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => (
        <li key={message.id} className={message.role === "user" ? "self-end" : "self-start"}>
          <div
            className={cn(
              "max-w-md rounded-lg px-3 py-2 text-sm",
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {message.content}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-xs">
              {message.role === "user" ? "Customer" : "Assistant"} · <LocalDateTime iso={message.createdAt} />
            </span>
            {message.missingTopics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {message.isDismissed ? `${topic} (dismissed)` : `Missing: ${topic}`}
              </Badge>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
