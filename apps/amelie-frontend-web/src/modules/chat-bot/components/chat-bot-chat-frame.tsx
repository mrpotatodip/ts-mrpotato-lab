import type { ReactNode } from "react";

type ChatBotChatFrameProps = {
  children: ReactNode;
};

// -----
// Fills the room so the chat's own layout can
// scroll inside it.
// -----
export function ChatBotChatFrame({ children }: ChatBotChatFrameProps) {
  return <div className="h-full min-h-0 *:h-full *:min-h-0">{children}</div>;
}
