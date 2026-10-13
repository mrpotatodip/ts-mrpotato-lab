import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Minus, PanelLeft, PanelRight, X } from "lucide-react";

import { Button, buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { chatBotKeys } from "../hooks/use-chat-bot-threads";
import { startChatBotNewChat } from "../stores";
import { ChatBotComposerView } from "./chat-bot-composer";

type ChatBotSheetSide = "left" | "right";

// -----
// A floating button that opens the assistant in a
// panel so the owner can ask about the screen they're
// on without leaving it. Minimize hides the panel and
// keeps the chat; close starts a new one next time.
// Saved chats stay on the page.
// -----
export function ChatBotSheet() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [side, setSide] = useState<ChatBotSheetSide>("right");
  const launcherRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const moveToLeft = side === "right";
  const showLauncher = !open || minimized;

  const reveal = useCallback(() => {
    if (!open) startChatBotNewChat();
    setOpen(true);
    setMinimized(false);
  }, [open]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        reveal();
        return;
      }
      setOpen(false);
      setMinimized(false);
    },
    [reveal],
  );

  useEffect(() => {
    if (minimized) launcherRef.current?.focus();
  }, [minimized]);

  const handleCreated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chatBotKeys.lists() });
  }, [queryClient]);

  return (
    <>
      {showLauncher ? (
        <Button
          ref={launcherRef}
          size={minimized ? "default" : "icon"}
          variant={minimized ? "outline" : "default"}
          aria-label={minimized ? "Show the assistant, chat in progress" : "Open the assistant"}
          className={cn(
            "fixed bottom-6 z-40 shadow-lg [&_svg]:size-5",
            minimized
              ? cn(
                  "h-12 gap-2 rounded-full border bg-card px-4 text-foreground hover:bg-accent",
                  side === "left" ? "left-6" : "right-6",
                )
              : "right-6 size-12 rounded-full",
          )}
          onClick={reveal}
        >
          <Bot />
          {minimized ? (
            <>
              <span>Assistant</span>
              <span className="size-2 rounded-full bg-status-info" aria-hidden />
            </>
          ) : null}
        </Button>
      ) : null}
      <Sheet open={open} onOpenChange={handleOpenChange} modal={false} disablePointerDismissal>
        <SheetContent
          side={side}
          overlay={false}
          className={cn(
            "inset-y-4 flex h-auto w-[calc(100%-2rem)] flex-col rounded-3xl border bg-card sm:max-w-xl [&>[data-slot=sheet-close]]:hidden",
            side === "left" ? "left-4" : "right-4",
            minimized && "hidden",
          )}
        >
          <div className="absolute top-3.5 right-4 flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={moveToLeft ? "Move assistant to the left" : "Move assistant to the right"}
              className="opacity-70 hover:opacity-100"
              onClick={() => setSide(moveToLeft ? "left" : "right")}
            >
              {moveToLeft ? <PanelLeft /> : <PanelRight />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Minimize assistant"
              className="opacity-70 hover:opacity-100"
              onClick={() => setMinimized(true)}
            >
              <Minus />
            </Button>
            <SheetClose
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "opacity-70 hover:opacity-100")}
            >
              <X />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
          <SheetHeader className="shrink-0">
            <SheetTitle>Assistant</SheetTitle>
            <SheetDescription className="sr-only">
              Ask the assistant to change your hours, menu, FAQs or profile.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 min-h-0 flex-1">
            <ChatBotComposerView threadId={undefined} onThreadCreated={handleCreated} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
