import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import type { UnansweredQuestion } from "@repo/contracts/amelie";

import { CustomerThreadSheet } from "#/modules/customer-thread";
import { LocalDateTime } from "#/modules/shared";

type UnansweredQuestionItemProps = {
  item: UnansweredQuestion;
  isDismissing: boolean;
  onDismiss: (messageId: string) => void;
};

export function UnansweredQuestionItem({ item, isDismissing, onDismiss }: UnansweredQuestionItemProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <li className="flex items-start justify-between gap-4 p-6">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">{item.question ?? "(question not found)"}</p>
        <div className="flex flex-wrap items-center gap-2">
          {item.topics.map((topic) => (
            <Badge key={topic} variant="secondary">
              {topic}
            </Badge>
          ))}
          <span className="text-muted-foreground text-sm"><LocalDateTime iso={item.askedAt} /></span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="View chat" title="View chat" onClick={() => setIsChatOpen(true)}>
          <MessageSquare />
        </Button>
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
      </div>
      <CustomerThreadSheet threadId={item.threadId} open={isChatOpen} onOpenChange={setIsChatOpen} />
    </li>
  );
}
