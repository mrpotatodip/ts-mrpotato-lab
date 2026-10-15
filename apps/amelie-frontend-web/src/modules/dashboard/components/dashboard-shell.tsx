import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { HotkeysProvider } from "@tanstack/react-hotkeys";

import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { ChatBotSheet, useChatBotCacheSync } from "#/modules/chat-bot";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";

type DashboardShellProps = {
  userName: string;
  userEmail: string;
  children: ReactNode;
};

// -----
// The frame every signed-in screen sits in: sidebar,
// top bar, then the page. The theme class lives here.
// The assistant button floats on every screen but
// the assistant's own page.
// -----
export function DashboardShell({ userName, userEmail, children }: DashboardShellProps) {
  useChatBotCacheSync();
  const onAssistantPage = useRouterState({
    select: (state) => state.location.pathname.startsWith("/chat-bot"),
  });

  return (
    <HotkeysProvider>
      <SidebarProvider>
        <DashboardSidebar userName={userName} userEmail={userEmail} />
        <SidebarInset>
          <DashboardHeader />
          <main className="dashboard-content">{children}</main>
        </SidebarInset>
        {onAssistantPage ? null : <ChatBotSheet />}
      </SidebarProvider>
    </HotkeysProvider>
  );
}
