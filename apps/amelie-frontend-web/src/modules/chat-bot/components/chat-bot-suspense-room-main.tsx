import { Suspense, useEffect, useSyncExternalStore } from "react";

import { AppBreadcrumb, AppBreadcrumbLink, AppBreadcrumbPage, AppBreadcrumbSeparator } from "#/modules/shared";
import { useChatBotRouteThreadId } from "../hooks/use-chat-bot-route-thread-id";
import { useSuspenseChatBotThread } from "../hooks/use-chat-bot-threads";
import { chatBotNewChatStore, peekCreatedThreadId, startChatBotNewChat } from "../stores";
import { toThreadTitle } from "../utils";
import { ChatBotComposer } from "./chat-bot-composer";
import { ChatBotRoomSkeleton } from "./chat-bot-room-skeleton";
import { ChatBotThreadOverflow } from "./chat-bot-thread-overflow";

// -----
// The assistant's room. The title bar waits for the
// thread (only a saved thread has one); the chat
// itself never waits on it.
// -----
export function ChatBotSuspenseRoomMain() {
  const routeThreadId = useChatBotRouteThreadId();
  const newChatCount = useSyncExternalStore(
    chatBotNewChatStore.subscribe,
    chatBotNewChatStore.get,
    chatBotNewChatStore.get,
  );

  // -----
  // The empty room starts clean: the store forgets the last chat.
  // -----
  useEffect(() => {
    if (routeThreadId == null) startChatBotNewChat();
  }, [routeThreadId]);

  const composerKey =
    routeThreadId == null || peekCreatedThreadId() === routeThreadId
      ? `new:${newChatCount}`
      : routeThreadId;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[32rem] flex-col gap-4 overflow-hidden">
      {routeThreadId ? (
        <Suspense fallback={<ChatBotRoomSkeleton />}>
          <ChatBotRoomView threadId={routeThreadId} />
        </Suspense>
      ) : null}
      <div className="min-h-0 flex-1">
        <ChatBotComposer key={composerKey} />
      </div>
    </div>
  );
}

type ChatBotRoomViewProps = {
  threadId: string;
};

function ChatBotRoomView({ threadId }: ChatBotRoomViewProps) {
  const { data: thread } = useSuspenseChatBotThread(threadId);

  return (
    <AppBreadcrumb
      className="shrink-0"
      trailing={<ChatBotThreadOverflow threadId={threadId} title={thread.title} />}
    >
      <AppBreadcrumbLink to="/chat-bot">Assistant</AppBreadcrumbLink>
      <AppBreadcrumbSeparator />
      <AppBreadcrumbPage>{toThreadTitle(thread.title)}</AppBreadcrumbPage>
    </AppBreadcrumb>
  );
}
