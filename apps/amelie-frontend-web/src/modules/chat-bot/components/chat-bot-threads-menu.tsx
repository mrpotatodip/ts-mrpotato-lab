import { useChatBotThreads } from "../hooks/use-chat-bot-threads";
import { ChatBotThreadMenuItem } from "./chat-bot-thread-menu-item";

type ChatBotThreadsMenuProps = {
  onNavigate?: () => void;
};

export function ChatBotThreadsMenu({ onNavigate }: ChatBotThreadsMenuProps) {
  const { data: threads } = useChatBotThreads();
  if (!threads?.length) return null;

  return (
    <nav
      aria-label="Chat threads"
      className="relative flex min-w-0 w-full flex-col gap-0.5 pl-12 before:absolute before:-top-[1.125rem] before:bottom-3 before:left-9 before:w-px before:bg-foreground/12"
    >
      {threads.map((thread) => (
        <ChatBotThreadMenuItem
          key={thread.id}
          thread={thread}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
} 
