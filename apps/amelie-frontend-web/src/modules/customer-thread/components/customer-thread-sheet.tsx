import { useState } from "react";
import { PanelLeft, PanelRight, X } from "lucide-react";

import { Button, buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { useCustomerThread } from "../hooks";
import { CustomerThreadMessages } from "./customer-thread-messages";
import { CustomerThreadMessagesSkeleton } from "./customer-thread-messages-skeleton";
import { LocalDateTime } from "#/modules/shared";

type CustomerThreadSheetSide = "left" | "right";

type CustomerThreadSheetProps = {
  threadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// -----
// One chat in a floating panel, same chrome as
// the assistant: inset, rounded, no overlay.
// -----
export function CustomerThreadSheet({ threadId, open, onOpenChange }: CustomerThreadSheetProps) {
  const [side, setSide] = useState<CustomerThreadSheetSide>("right");
  const moveToLeft = side === "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
      <SheetContent
        side={side}
        overlay={false}
        className={cn(
          "inset-y-4 flex h-auto w-[calc(100%-2rem)] flex-col rounded-3xl border bg-card sm:max-w-xl [&>[data-slot=sheet-close]]:hidden",
          side === "left" ? "left-4" : "right-4",
        )}
      >
        <div className="absolute top-3.5 right-4 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={moveToLeft ? "Move chat to the left" : "Move chat to the right"}
            className="opacity-70 hover:opacity-100"
            onClick={() => setSide(moveToLeft ? "left" : "right")}
          >
            {moveToLeft ? <PanelLeft /> : <PanelRight />}
          </Button>
          <SheetClose
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "opacity-70 hover:opacity-100")}
          >
            <X />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
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
        <SheetHeader className="shrink-0">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>Loading the conversation.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <CustomerThreadMessagesSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SheetHeader className="shrink-0">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription className="text-destructive">{error.message}</SheetDescription>
        </SheetHeader>
      </>
    );
  }

  return (
    <>
      <SheetHeader className="shrink-0">
        <SheetTitle>{data.title ?? "Chat"}</SheetTitle>
        <SheetDescription>
          Started <LocalDateTime iso={data.startedAt} />
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <CustomerThreadMessages messages={data.messages} />
      </div>
    </>
  );
}
