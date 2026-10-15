import { useEffect, useState, type CSSProperties } from "react";
import { MessageSquarePlus } from "lucide-react";
import type { PublicChatAppearance } from "@repo/contracts/amelie";

type CustomerChatTheme = CSSProperties & {
  "--primary"?: string;
  "--primary-foreground"?: string;
  "--ring"?: string;
};

import { Button } from "#/components/ui/button";
import { toCustomerChatInk } from "../utils";
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
  appearance: PublicChatAppearance;
};

type PublicChatStart = {
  threadId: string | null;
  generation: number;
};

// -----
// Client-only: the Customer's id lives in
// this browser's storage, not on the server.
// -----
export function PublicChatRoom({ slug, location, country, appearance }: PublicChatRoomProps) {
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

  const accentStyle: CustomerChatTheme | undefined = appearance.customerChatAccent
    ? {
        "--primary": appearance.customerChatAccent,
        "--primary-foreground": toCustomerChatInk(appearance.customerChatAccent),
        "--ring": appearance.customerChatAccent,
      }
    : undefined;

  return (
    <ChatBotSurfaceContext.Provider value={CHAT_BOT_CUSTOMER_SURFACE}>
      <div className="flex h-dvh min-h-0 flex-col" style={accentStyle}>
        <header className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-end p-4">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New chat"
            title="New chat"
            onClick={startNewChat}
            disabled={!start}
          >
            <MessageSquarePlus />
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
