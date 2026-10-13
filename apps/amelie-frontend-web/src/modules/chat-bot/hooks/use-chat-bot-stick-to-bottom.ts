import { useEffect, useRef } from "react";

import { CHAT_BOT_PINNED_THRESHOLD_PX } from "../constants";

type ChatBotStickToBottom = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
};

// -----
// Follow growing content only while pinned near
// the bottom; a new user message always jumps.
// -----
export function useChatBotStickToBottom(
  sentCount: number,
  enabled: boolean,
): ChatBotStickToBottom {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!enabled || !scroller || !content) return;

    const toBottom = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    const onScroll = () => {
      const gap =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      pinned.current = gap <= CHAT_BOT_PINNED_THRESHOLD_PX;
    };
    // -----
    // Content height changes on every typed
    // character, so follow it while pinned.
    // -----
    const observer = new ResizeObserver(() => {
      if (pinned.current) toBottom();
    });

    toBottom();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(content);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [enabled]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || sentCount === 0) return;
    pinned.current = true;
    scroller.scrollTop = scroller.scrollHeight;
  }, [sentCount]);

  return { scrollRef, contentRef };
}
