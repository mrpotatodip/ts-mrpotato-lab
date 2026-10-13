import { useEffect } from "react";

import { renderInlineMarkdown } from "#/modules/shared";
import { useChatBotSmoothTextAnimation } from "../../hooks/use-chat-bot-smooth-text-animation";
import { toStreamingMarkdown } from "../../utils";

type ChatBotSmoothTextAnimationProps = {
  text: string;
  streaming: boolean;
  animate: boolean;
  onRevealed?: () => void;
};

// -----
// Inline markdown typed out with a cursor while
// streaming; animate is true for live messages.
// -----
export function ChatBotSmoothTextAnimation({
  text,
  streaming,
  animate,
  onRevealed,
}: ChatBotSmoothTextAnimationProps) {
  const smooth = useChatBotSmoothTextAnimation(text, animate);
  const typing = streaming || smooth.revealing;

  useEffect(() => {
    if (animate && !typing) onRevealed?.();
  }, [animate, typing, onRevealed]);

  return (
    <>
      {renderInlineMarkdown(
        typing ? toStreamingMarkdown(smooth.text) : smooth.text,
      )}
      {typing ? (
        <span className="animate-pulse" aria-hidden>
          ▍
        </span>
      ) : null}
    </>
  );
}
