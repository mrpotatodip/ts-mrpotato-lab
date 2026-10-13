import { useState } from "react";
import type { CustomerThreadSummary } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { CustomerThreadSheet } from "./customer-thread-sheet";
import { LocalDateTime } from "#/modules/shared";

type CustomerThreadItemProps = {
  thread: CustomerThreadSummary;
};

export function CustomerThreadItem({ thread }: CustomerThreadItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between gap-4 rounded-none p-6 text-left whitespace-normal"
        onClick={() => setIsOpen(true)}
      >
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">{thread.title ?? "Chat"}</p>
          <p className="text-muted-foreground text-sm">
            <LocalDateTime iso={thread.lastMessageAt} /> · {thread.messageCount} messages
          </p>
        </div>
        {thread.unansweredCount > 0 ? (
          <Badge variant="secondary" className="shrink-0">
            {thread.unansweredCount} unanswered
          </Badge>
        ) : null}
      </Button>
      <CustomerThreadSheet threadId={thread.id} open={isOpen} onOpenChange={setIsOpen} />
    </li>
  );
}
