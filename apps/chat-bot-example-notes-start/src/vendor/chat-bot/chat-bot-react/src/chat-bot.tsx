import { useCallback, useState, type ComponentType } from "react";
import { ChatBotRoom, type ChatBotRoomProps } from "./chat-bot-room";
import { ThreadList } from "./thread-list";
import { useChatBotThreads } from "./use-chat-bot-threads";

export type ChatBotProps = Omit<ChatBotRoomProps, "threadId" | "onThreadCreated"> & {
  // Show the list of past conversations beside the chat. Default true.
  threads?: boolean;
  // Swap the conversation view, e.g. one that adds a progress display. It gets the room's props.
  room?: ComponentType<ChatBotRoomProps>;
};

type CurrentRoom = { key: string; threadId?: string };

// -----
// The whole chat: past conversations on the left, the
// current one on the right. Point it at your route:
//   <ChatBot endpoint="/api/chat" />
// -----
export function ChatBot({ threads: showThreads = true, room: Room = ChatBotRoom, className, ...roomProps }: ChatBotProps) {
  const { endpoint, headers, credentials, fetch } = roomProps;
  const list = useChatBotThreads({ endpoint, headers, credentials, fetch });
  const [current, setCurrent] = useState<CurrentRoom>({ key: "new-0" });
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [fresh, setFresh] = useState(0);

  const startNew = useCallback(() => {
    setFresh((count) => count + 1);
    setCurrent({ key: `new-${fresh + 1}` });
    setActiveId(undefined);
  }, [fresh]);

  const open = useCallback((id: string) => {
    setCurrent({ key: id, threadId: id });
    setActiveId(id);
  }, []);

  // -----
  // A thread made by sending a message must not remount
  // the room mid-answer: only mark it, and reload the list.
  // -----
  const created = useCallback(
    (id: string) => {
      setActiveId(id);
      void list.refresh();
    },
    [list],
  );

  return (
    <div className={className ? `cb-root ${className}` : "cb-root"}>
      {showThreads ? (
        <ThreadList
          threads={list.threads}
          activeId={activeId}
          onSelect={open}
          onNew={startNew}
          onRename={(id, title) => void list.rename(id, title)}
          onDelete={(id) => {
            void list.remove(id);
            if (id === activeId) startNew();
          }}
        />
      ) : null}
      <Room key={current.key} {...roomProps} threadId={current.threadId} onThreadCreated={created} />
    </div>
  );
}
