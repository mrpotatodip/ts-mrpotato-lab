import type { ChatBotThreadListItem } from "@repo/chat-bot-api/contracts";

export type ThreadListProps = {
  threads: ChatBotThreadListItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
};

// -----
// The caller's conversations, newest activity first (the
// order the server gives them). Rename and delete show
// only when you pass the handlers.
// -----
export function ThreadList({ threads, activeId, onSelect, onNew, onRename, onDelete }: ThreadListProps) {
  return (
    <nav className="cb-threads" aria-label="Conversations">
      <button type="button" className="cb-button cb-button--primary cb-new" onClick={onNew}>
        New chat
      </button>
      <ul>
        {threads.map((thread) => (
          <li key={thread.id} className={thread.id === activeId ? "cb-thread cb-thread--active" : "cb-thread"}>
            <button type="button" className="cb-thread-open" onClick={() => onSelect(thread.id)}>
              {thread.title ?? "Untitled"}
            </button>
            {onRename ? (
              <button
                type="button"
                className="cb-icon"
                aria-label={`Rename ${thread.title ?? "chat"}`}
                onClick={() => {
                  const title = window.prompt("Rename chat", thread.title ?? "")?.trim();
                  if (title) onRename(thread.id, title);
                }}
              >
                ✎
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="cb-icon"
                aria-label={`Delete ${thread.title ?? "chat"}`}
                onClick={() => {
                  if (window.confirm("Delete this chat?")) onDelete(thread.id);
                }}
              >
                ✕
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
