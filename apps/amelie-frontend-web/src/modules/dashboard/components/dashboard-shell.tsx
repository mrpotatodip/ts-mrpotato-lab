import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { ChatBotSheet, useChatBotCacheSync } from "#/modules/chat-bot";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";

type DashboardShellProps = {
  userName: string;
  children: ReactNode;
};

// -----
// The frame every signed-in screen sits in: sidebar,
// top bar, then the page. The theme class lives here.
// The assistant button floats on every screen but
// the assistant's own page.
// -----
export function DashboardShell({ userName, children }: DashboardShellProps) {
  useChatBotCacheSync();
  const onAssistantPage = useRouterState({
    select: (state) => state.location.pathname.startsWith("/chat-bot"),
  });

  return (
    <SidebarProvider>
      <DashboardSidebar userName={userName} />
      <SidebarInset>
        <DashboardHeader />
        <main className="dashboard-content">{children}</main>
      </SidebarInset>
      {onAssistantPage ? null : <ChatBotSheet />}
    </SidebarProvider>
  );
}
