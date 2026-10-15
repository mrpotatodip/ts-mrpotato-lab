import { useState } from "react";
import type { CustomerThreadSummary } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { DASHBOARD_ROW_LINK_CLASS } from "#/modules/dashboard/constants/dashboard-nav";
import { DashboardStatusBadge } from "#/modules/dashboard/components/dashboard-status-badge";
import { LocalDateTime } from "#/modules/shared";
import { CustomerThreadSheet } from "./customer-thread-sheet";

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
        className={cn(
          DASHBOARD_ROW_LINK_CLASS,
          "h-auto w-full items-center justify-between gap-3 rounded-none text-left whitespace-normal",
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{thread.title ?? "Chat"}</p>
          <p className="stat-label">
            {thread.messageCount} {thread.messageCount === 1 ? "message" : "messages"} ·{" "}
            <LocalDateTime iso={thread.lastMessageAt} />
          </p>
        </div>
        {thread.unansweredCount > 0 ? (
          <DashboardStatusBadge tone="warning">
            {thread.unansweredCount} unanswered
          </DashboardStatusBadge>
        ) : null}
      </Button>
      <CustomerThreadSheet threadId={thread.id} open={isOpen} onOpenChange={setIsOpen} />
    </li>
  );
}
