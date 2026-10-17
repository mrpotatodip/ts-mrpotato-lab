import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { HotkeysProvider } from "@tanstack/react-hotkeys";

import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { useAdminAccess } from "#/modules/admin";
import { ChatBotSheet, useChatBotCacheSync } from "#/modules/chat-bot";
import { PowerMarksProvider, usePowerMarksPreference } from "#/modules/shared";
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
// the assistant's own page. Power marks draw only for a
// superuser who switched them on.
// -----
export function DashboardShell({ userName, userEmail, children }: DashboardShellProps) {
  useChatBotCacheSync();
  const { isSuperuser } = useAdminAccess();
  const { on } = usePowerMarksPreference();
  const onAssistantPage = useRouterState({
    select: (state) => state.location.pathname.startsWith("/chat-bot"),
  });

  return (
    <PowerMarksProvider visible={isSuperuser && on}>
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
    </PowerMarksProvider>
  );
}
