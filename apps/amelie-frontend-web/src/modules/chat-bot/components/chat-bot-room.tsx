import { Outlet } from "@tanstack/react-router";

import { ChatBotSuspenseRoomMain } from "./chat-bot-suspense-room-main";

// -----
// The child routes only preload the thread.
// -----
export function ChatBotRoom() {
  return (
    <div className="h-full min-h-0">
      <ChatBotSuspenseRoomMain />
      <Outlet />
    </div>
  );
}
