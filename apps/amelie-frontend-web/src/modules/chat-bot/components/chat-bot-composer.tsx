import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { useChatBot } from "../hooks/use-chat-bot";
import { useChatBotRouteThreadId } from "../hooks/use-chat-bot-route-thread-id";
import { chatBotKeys, useSuspenseChatBotThread } from "../hooks/use-chat-bot-threads";
import { setChatBotStreamThreadId, setOnChatBotThreadCreated } from "../stores";
import { toUiMessages } from "../utils";
import { ChatBotChatFrame } from "./chat-bot-chat-frame";
import { ChatBotThreadSkeleton } from "./chat-bot-thread-skeleton";

// -----
// The page's chat: the thread comes from the route,
// and a new thread moves the URL onto it.
// -----
export function ChatBotComposer() {
  const threadId = useChatBotRouteThreadId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleCreated = useCallback(
    (id: string) => {
      void queryClient.invalidateQueries({ queryKey: chatBotKeys.lists() });
      void navigate({
        to: "/chat-bot/$threadId",
        params: { threadId: id },
        replace: true,
      });
    },
    [navigate, queryClient],
  );

  return <ChatBotComposerView threadId={threadId} onThreadCreated={handleCreated} />;
}

type ChatBotComposerViewProps = {
  threadId: string | undefined;
  onThreadCreated: (id: string) => void;
};

// -----
// The chat itself, with no idea where its thread
// comes from: the page reads the route, the sheet
// always starts a new chat.
// -----
export function ChatBotComposerView({ threadId, onThreadCreated }: ChatBotComposerViewProps) {
  const [startedOnNewChat] = useState(() => threadId == null);

  useEffect(() => {
    if (threadId) setChatBotStreamThreadId(threadId);
  }, [threadId]);

  useEffect(() => {
    setOnChatBotThreadCreated(onThreadCreated);
    return () => setOnChatBotThreadCreated(undefined);
  }, [onThreadCreated]);

  return (
    <div className="h-full min-h-0">
      {threadId && !startedOnNewChat ? (
        <Suspense fallback={<ChatBotThreadSkeleton />}>
          <ChatBotComposerHydrated threadId={threadId} />
        </Suspense>
      ) : (
        <ChatBotComposerLive />
      )}
    </div>
  );
}

function ChatBotComposerLive() {
  const chat = useChatBot();

  return (
    <ChatBotChatFrame>
      <chat.AppChat />
    </ChatBotChatFrame>
  );
}

type ChatBotComposerHydratedProps = {
  threadId: string;
};

function ChatBotComposerHydrated({ threadId }: ChatBotComposerHydratedProps) {
  const { data } = useSuspenseChatBotThread(threadId);
  const initialMessages = useMemo(
    () => toUiMessages(data.messages),
    [data.messages],
  );
  const chat = useChatBot({ threadId, initialMessages });
  return (
    <ChatBotChatFrame>
      <chat.AppChat />
    </ChatBotChatFrame>
  );
}
