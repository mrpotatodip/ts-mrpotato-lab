import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

import { Button } from "#/components/ui/button";
import { livePublicChatThreadId } from "../api/live-public-chat-thread-id";
import { CHAT_BOT_CUSTOMER_SURFACE } from "../constants";
import { ChatBotSurfaceContext } from "../contexts";
import { usePublicChat } from "../hooks/use-public-chat";
import {
  clearCreatedThreadId,
  setChatBotStreamThreadId,
  setOnChatBotThreadCreated,
  setPublicChatSession,
} from "../stores";
import { publicChatAnonymousId, writePublicChatThreadId } from "../utils";
import { ChatBotChatFrame } from "./chat-bot-chat-frame";
import { ChatBotThreadSkeleton } from "./chat-bot-thread-skeleton";

type PublicChatRoomProps = {
  slug: string;
  location?: string;
  country?: string;
};

type PublicChatStart = {
  threadId: string | null;
  generation: number;
};

// -----
// Client-only: the Customer's id lives in
// this browser's storage, not on the server.
// -----
export function PublicChatRoom({ slug, location, country }: PublicChatRoomProps) {
  const [start, setStart] = useState<PublicChatStart | null>(null);

  useEffect(() => {
    let cancelled = false;
    const anonymousId = publicChatAnonymousId();
    setPublicChatSession({ slug, anonymousId, location, country });
    setOnChatBotThreadCreated((id) => writePublicChatThreadId(slug, id));
    void livePublicChatThreadId(slug, anonymousId).then((threadId) => {
      if (cancelled) return;
      setChatBotStreamThreadId(threadId ?? undefined);
      setStart({ threadId, generation: 0 });
    });
    return () => {
      cancelled = true;
      setPublicChatSession(undefined);
      setOnChatBotThreadCreated(undefined);
      setChatBotStreamThreadId(undefined);
      clearCreatedThreadId();
    };
  }, [slug, location, country]);

  const startNewChat = () => {
    writePublicChatThreadId(slug, null);
    setChatBotStreamThreadId(undefined);
    clearCreatedThreadId();
    setStart((current) => ({ threadId: null, generation: (current?.generation ?? 0) + 1 }));
  };

  return (
    <ChatBotSurfaceContext.Provider value={CHAT_BOT_CUSTOMER_SURFACE}>
      <div className="flex h-dvh min-h-0 flex-col">
        <header className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-between p-4">
          <h1 className="text-sm font-medium">Chat with us</h1>
          <Button variant="ghost" size="sm" onClick={startNewChat} disabled={!start}>
            <MessageSquarePlus />
            New chat
          </Button>
        </header>
        <div className="min-h-0 flex-1">
          {start ? (
            <PublicChatLive key={`${start.generation}:${start.threadId ?? "new"}`} threadId={start.threadId} />
          ) : (
            <ChatBotThreadSkeleton />
          )}
        </div>
      </div>
    </ChatBotSurfaceContext.Provider>
  );
}

type PublicChatLiveProps = {
  threadId: string | null;
};

function PublicChatLive({ threadId }: PublicChatLiveProps) {
  const chat = usePublicChat(threadId);

  return (
    <ChatBotChatFrame>
      <chat.AppChat />
    </ChatBotChatFrame>
  );
}
