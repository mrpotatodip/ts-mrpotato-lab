import type { CustomerThreadMessage } from "@repo/contracts/amelie";

import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent, MessageFooter } from "#/components/ui/message";
import { DashboardStatusBadge } from "#/modules/dashboard/components/dashboard-status-badge";
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
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
        const isCustomer = message.role === "user";

        return (
          <Message key={message.id} align={isCustomer ? "end" : "start"}>
            <MessageContent>
              <Bubble variant={isCustomer ? "default" : "muted"} align={isCustomer ? "end" : "start"}>
                <BubbleContent>{message.content}</BubbleContent>
              </Bubble>
              <MessageFooter className="flex-wrap gap-1.5">
                <span>
                  {isCustomer ? "Customer" : "Assistant"} · <LocalDateTime iso={message.createdAt} />
                </span>
                {message.missingTopics.map((topic) => (
                  <DashboardStatusBadge key={topic} tone="warning">
                    {message.isDismissed ? `${topic} (dismissed)` : `Missing: ${topic}`}
                  </DashboardStatusBadge>
                ))}
              </MessageFooter>
            </MessageContent>
          </Message>
        );
      })}
    </div>
  );
}
