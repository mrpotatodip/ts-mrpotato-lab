import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import type { UnansweredQuestion } from "@repo/contracts/amelie";

import { CustomerThreadSheet } from "#/modules/customer-thread";
import { LocalDateTime, PowerMark } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";

type UnansweredQuestionItemProps = {
  item: UnansweredQuestion;
  isDismissing: boolean;
  onDismiss: (messageId: string) => void;
};

export function UnansweredQuestionItem({ item, isDismissing, onDismiss }: UnansweredQuestionItemProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { can } = useActiveTenantRole();
  const canViewChat = can("company:chats:threads:read");
  const canDismiss = can("company:unanswered:questions:dismiss");

  return (
    <li className="hover:bg-accent/40 flex items-start justify-between gap-4 px-6 py-5 transition-colors">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium">{item.question ?? "(question not found)"}</p>
        <div className="flex flex-wrap items-center gap-2">
          {item.topics.map((topic) => (
            <Badge key={topic} variant="secondary">
              {topic}
            </Badge>
          ))}
          <span className="text-muted-foreground text-sm">
            <LocalDateTime iso={item.askedAt} />
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canViewChat ? (
          <>
            <PowerMark power="company:chats:threads:read" />
            <Button variant="ghost" size="icon-sm" aria-label="View chat" title="View chat" onClick={() => setIsChatOpen(true)}>
              <MessageSquare />
            </Button>
          </>
        ) : null}
        {canDismiss ? (
          <>
            <PowerMark power="company:unanswered:questions:dismiss" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss question"
              title="Dismiss"
              disabled={isDismissing}
              onClick={() => onDismiss(item.messageId)}
            >
              <X />
            </Button>
          </>
        ) : null}
      </div>
      <CustomerThreadSheet threadId={item.threadId} open={isChatOpen} onOpenChange={setIsChatOpen} />
    </li>
  );
}
