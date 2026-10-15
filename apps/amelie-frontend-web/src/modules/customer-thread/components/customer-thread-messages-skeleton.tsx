import { Skeleton } from "#/components/ui/skeleton";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";

type CustomerThreadBubbleSkeletonProps = {
  align: "start" | "end";
};

function CustomerThreadBubbleSkeleton({ align }: CustomerThreadBubbleSkeletonProps) {
  return (
    <Message align={align}>
      <MessageContent>
        <Bubble variant={align === "end" ? "default" : "muted"} align={align}>
          <BubbleContent>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48 bg-foreground/15" />
              {align === "start" ? <Skeleton className="h-4 w-32 bg-foreground/15" /> : null}
            </div>
          </BubbleContent>
        </Bubble>
        <Skeleton className="h-3 w-28" />
      </MessageContent>
    </Message>
  );
}

// -----
// Chat bubbles on alternating sides, the shape of
// the messages that are about to load.
// -----
export function CustomerThreadMessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <CustomerThreadBubbleSkeleton align="end" />
      <CustomerThreadBubbleSkeleton align="start" />
      <CustomerThreadBubbleSkeleton align="end" />
      <CustomerThreadBubbleSkeleton align="start" />
    </div>
  );
}
