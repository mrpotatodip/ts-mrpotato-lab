import { Link } from "@tanstack/react-router";

import { cn } from "#/lib/utils";
import { PageCard } from "#/modules/shared";
import { DASHBOARD_RECENT_LIMIT, DASHBOARD_ROW_LINK_CLASS } from "../constants";
import type { DashboardOverviewData } from "../hooks";
import { formatRelativeTime } from "../utils";
import { DashboardStatusBadge } from "./dashboard-status-badge";
import { DashboardViewAllLink } from "./dashboard-view-all-link";

type DashboardRecentThreadsProps = {
  threads: DashboardOverviewData["recentThreads"];
};

// -----
// The latest Customer chats. Amber means the assistant
// had to say "I don't know" at least once in that chat.
// -----
export function DashboardRecentThreads({ threads }: DashboardRecentThreadsProps) {
  const rows = threads.slice(0, DASHBOARD_RECENT_LIMIT);

  return (
    <PageCard
      title="Recent chats"
      description="The latest conversations. Amber means the assistant had to say it didn't know."
      action={<DashboardViewAllLink to="/customers" />}
      contentClassName="p-0"
    >
      {rows.length === 0 ? (
        <p className="stat-label p-6">No Customer has chatted yet.</p>
      ) : (
        <ul className="divide-y">
          {rows.map((thread) => (
            <li key={thread.id}>
              <Link
                to="/customers/$threadId"
                params={{ threadId: thread.id }}
                className={cn(DASHBOARD_ROW_LINK_CLASS, "items-center justify-between gap-3")}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{thread.title ?? "Untitled chat"}</p>
                  <p className="stat-label">
                    {thread.messageCount} {thread.messageCount === 1 ? "message" : "messages"} ·{" "}
                    {formatRelativeTime(thread.lastMessageAt)}
                  </p>
                </div>
                {thread.unansweredCount > 0 ? (
                  <DashboardStatusBadge tone="warning">{thread.unansweredCount} unanswered</DashboardStatusBadge>
                ) : (
                  <DashboardStatusBadge tone="success">Answered</DashboardStatusBadge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageCard>
  );
}
