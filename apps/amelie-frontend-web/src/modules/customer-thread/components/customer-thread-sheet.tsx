import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { useCustomerThread } from "../hooks";
import { CustomerThreadMessages } from "./customer-thread-messages";
import { CustomerThreadMessagesSkeleton } from "./customer-thread-messages-skeleton";
import { LocalDateTime } from "#/modules/shared";

type CustomerThreadSheetProps = {
  threadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// -----
// One chat in a panel on the right that floats off the
// screen edges. The chat loads when the panel opens.
// -----
export function CustomerThreadSheet({ threadId, open, onOpenChange }: CustomerThreadSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-[2px]"
        className="inset-y-4 right-4 h-auto w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border bg-card sm:max-w-md"
      >
        <CustomerThreadSheetBody threadId={threadId} />
      </SheetContent>
    </Sheet>
  );
}

type CustomerThreadSheetBodyProps = {
  threadId: string;
};

function CustomerThreadSheetBody({ threadId }: CustomerThreadSheetBodyProps) {
  const { data, isPending, error } = useCustomerThread(threadId);

  if (isPending) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>Loading the conversation.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <CustomerThreadMessagesSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription className="text-destructive">{error.message}</SheetDescription>
        </SheetHeader>
      </>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{data.title ?? "Chat"}</SheetTitle>
        <SheetDescription>Started <LocalDateTime iso={data.startedAt} /></SheetDescription>
      </SheetHeader>
      <div className="mt-6">
        <CustomerThreadMessages messages={data.messages} />
      </div>
    </>
  );
}
