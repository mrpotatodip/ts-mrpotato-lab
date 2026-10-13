import { Skeleton } from "#/components/ui/skeleton";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";

type ChatBotThreadBubbleSkeletonProps = {
  align: "start" | "end";
};

function ChatBotThreadBubbleSkeleton({ align }: ChatBotThreadBubbleSkeletonProps) {
  return (
    <Message align={align}>
      <MessageContent>
        <Bubble variant={align === "end" ? "default" : "muted"}>
          <BubbleContent>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48 bg-foreground/15" />
              <Skeleton className="h-4 w-32 bg-foreground/15" />
            </div>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

// -----
// Thread chrome while the stored
// transcript is still loading.
// -----
export function ChatBotThreadSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-col gap-8">
          <ChatBotThreadBubbleSkeleton align="end" />
          <ChatBotThreadBubbleSkeleton align="start" />
          <ChatBotThreadBubbleSkeleton align="end" />
          <ChatBotThreadBubbleSkeleton align="start" />
        </div>
      </div>
      <div className="shrink-0 pb-12 lg:pb-0">
        <div className="p-4 px-6 lg:px-16">
          <Skeleton className="h-10 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
