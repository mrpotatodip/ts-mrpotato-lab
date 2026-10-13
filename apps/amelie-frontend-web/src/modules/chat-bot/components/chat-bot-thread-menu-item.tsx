import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import type { ChatBotThreadListItem } from "@repo/contracts/chat-bots";
import { toThreadTitle } from "../utils";

type ChatBotThreadMenuItemProps = {
  thread: ChatBotThreadListItem;
  onNavigate?: () => void;
};

export function ChatBotThreadMenuItem({
  thread,
  onNavigate,
}: ChatBotThreadMenuItemProps) {
  const title = toThreadTitle(thread.title);

  return (
    <div className="relative min-w-0">
      <span
        aria-hidden
        className="absolute -left-3 top-1/2 h-px w-3 bg-foreground/12"
      />
      <Button
        nativeButton={false}
        render={
          <Link
            to="/chat-bot/$threadId"
            params={{ threadId: thread.id }}
            activeProps={{ className: "font-medium text-foreground" }}
          />
        }
        size="sm"
        variant="ghost"
        className="h-auto w-full min-w-0 justify-start overflow-hidden py-1.5 text-left text-sm font-normal text-foreground/60"
        onClick={onNavigate}
      >
        <span className="min-w-0 truncate">{title}</span>
      </Button>
    </div>
  );
}
