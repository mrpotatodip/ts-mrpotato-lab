import { useEffect, useRef, useState } from "react";

import { nextRevealPosition } from "../utils";

function prefersReducedMotion(): boolean {
  return (
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

export type ChatBotSmoothText = {
  text: string;
  revealing: boolean;
};

// -----
// Types text out; animate is read once on
// mount, and typing finishes after the stream.
// -----
export function useChatBotSmoothTextAnimation(
  text: string,
  animate: boolean,
): ChatBotSmoothText {
  const [animating] = useState(() => animate && !prefersReducedMotion());
  const [shown, setShown] = useState(0);
  const position = useRef(0);
  const target = useRef(text.length);
  const frame = useRef(0);

  // -----
  // One frame loop while behind: new text moves
  // the target, it doesn't restart the loop.
  // -----
  useEffect(() => {
    target.current = text.length;
    if (!animating || frame.current !== 0) return;
    let last: number | null = null;
    const tick = (now: number) => {
      const elapsed = last == null ? 16 : now - last;
      last = now;
      position.current = nextRevealPosition(position.current, target.current, elapsed);
      setShown(Math.floor(position.current));
      frame.current = position.current < target.current ? requestAnimationFrame(tick) : 0;
    };
    frame.current = requestAnimationFrame(tick);
  }, [animating, text.length]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  if (!animating) return { text, revealing: false };
  const length = Math.min(shown, text.length);
  return { text: text.slice(0, length), revealing: length < text.length };
}
