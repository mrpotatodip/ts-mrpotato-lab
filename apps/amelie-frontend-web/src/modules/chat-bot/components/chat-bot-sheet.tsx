import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatForDisplay, useHotkeys } from "@tanstack/react-hotkeys";
import { Bot, Minus, PanelLeft, PanelRight, X } from "lucide-react";

import { Button, buttonVariants } from "#/components/ui/button";
import { Kbd } from "#/components/ui/kbd";
import { cn } from "#/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { chatBotKeys } from "../hooks/use-chat-bot-threads";
import { CHAT_BOT_CLOSE_HOTKEY, CHAT_BOT_TOGGLE_HOTKEY } from "../constants";
import { useHydrated, useSheetSide } from "#/modules/shared";
import { startChatBotNewChat } from "../stores";
import { ChatBotComposerView } from "./chat-bot-composer";
import { ChatBotSoundToggle } from "./chat-bot-sound-toggle";

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
  const [instant, setInstant] = useState(false);
  const { side, moveToOppositeSide, wiggleClassName, onWiggleEnd } = useSheetSide();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const moveToLeft = side === "right";
  const showLauncher = !open || minimized;

  const reveal = useCallback(() => {
    if (!open) startChatBotNewChat();
    setOpen(true);
    setMinimized(false);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setMinimized(false);
  }, []);

  const minimize = useCallback(() => {
    setMinimized(true);
  }, []);

  const toggle = useCallback(() => {
    if (open && !minimized) {
      setMinimized(true);
      return;
    }
    reveal();
  }, [open, minimized, reveal]);

  // Keyboard toggles skip the slide; clicks keep it.
  const toggleByKey = useCallback(() => {
    setInstant(true);
    toggle();
  }, [toggle]);

  const closeByKey = useCallback(() => {
    setInstant(true);
    close();
  }, [close]);

  const revealByClick = useCallback(() => {
    setInstant(false);
    reveal();
  }, [reveal]);

  const minimizeByClick = useCallback(() => {
    setInstant(false);
    minimize();
  }, [minimize]);

  const handleOpenChange = useCallback(
    (next: boolean, details: { reason: string }) => {
      setInstant(details.reason === "escape-key");
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

  const hydrated = useHydrated();
  const panelVisible = open && !minimized;
  const toggleHotkeyLabel = hydrated ? formatForDisplay(CHAT_BOT_TOGGLE_HOTKEY) : null;
  const closeHotkeyLabel = hydrated ? formatForDisplay(CHAT_BOT_CLOSE_HOTKEY) : null;
  const launcherLabel = minimized ? "Show the assistant, chat in progress" : "Open the assistant";

  useHotkeys([
    {
      hotkey: CHAT_BOT_TOGGLE_HOTKEY,
      callback: toggleByKey,
      options: {
        requireReset: true,
        meta: { name: "Show or hide assistant", group: "Assistant" },
      },
    },
    {
      hotkey: CHAT_BOT_CLOSE_HOTKEY,
      callback: closeByKey,
      options: {
        enabled: panelVisible,
        requireReset: true,
        meta: { name: "Close assistant", group: "Assistant" },
      },
    },
  ]);

  return (
    <>
      <Button
        ref={launcherRef}
        size="icon"
        variant={minimized ? "outline" : "default"}
        aria-label={toggleHotkeyLabel ? `${launcherLabel} ${toggleHotkeyLabel}` : launcherLabel}
        inert={!showLauncher}
        className={cn(
          "assistant-bot-excited relative fixed bottom-6 z-40 overflow-visible shadow-lg transition-[opacity,scale] duration-150 ease-out [&_svg]:size-5",
          !showLauncher && "pointer-events-none scale-95 opacity-0",
          instant && "duration-0",
          minimized
            ? cn(
                "size-12 rounded-full border bg-card text-foreground hover:bg-accent",
                side === "left" ? "left-6" : "right-6",
              )
            : "right-6 size-12 rounded-full",
        )}
        onClick={revealByClick}
      >
        <Bot />
        {minimized ? (
          <span className="bg-status-info absolute top-2 right-2 size-2 rounded-full" aria-hidden />
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={handleOpenChange} modal={false} disablePointerDismissal>
        <SheetContent
          side={side}
          overlay={false}
          className={cn(
            "inset-y-4 flex h-auto w-[calc(100%-2rem)] flex-col rounded-3xl border bg-card shadow-xs sm:max-w-lg [&>[data-slot=sheet-close]]:hidden",
            side === "left" ? "left-4" : "right-4",
            wiggleClassName,
            minimized &&
              cn(
                "pointer-events-none opacity-0 motion-reduce:translate-none",
                side === "left" ? "-translate-x-[calc(100%+1rem)]" : "translate-x-[calc(100%+1rem)]",
              ),
          )}
          data-instant={instant ? "" : undefined}
          inert={minimized}
          onAnimationEnd={onWiggleEnd}
        >
          <div className="absolute top-3.5 right-4 flex items-center">
            <ChatBotSoundToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={moveToLeft ? "Move assistant to the left" : "Move assistant to the right"}
              className={cn(
                "opacity-70 hover:opacity-100",
                moveToLeft ? "sheet-move-wiggle-left" : "sheet-move-wiggle-right",
              )}
              onClick={moveToOppositeSide}
            >
              {moveToLeft ? <PanelLeft /> : <PanelRight />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={toggleHotkeyLabel ? `Minimize assistant ${toggleHotkeyLabel}` : "Minimize assistant"}
              className="opacity-70 hover:opacity-100"
              onClick={minimizeByClick}
            >
              <Minus />
            </Button>
            <SheetClose
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "opacity-70 hover:opacity-100")}
            >
              <X />
              <span className="sr-only">{closeHotkeyLabel ? `Close ${closeHotkeyLabel}` : "Close"}</span>
            </SheetClose>
          </div>
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="size-5" />
              {toggleHotkeyLabel ? <Kbd>{toggleHotkeyLabel}</Kbd> : null}
              <span className="sr-only">Assistant</span>
            </SheetTitle>
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
