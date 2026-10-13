import { Link } from "@tanstack/react-router";

import { cn } from "#/lib/utils";
import { PageCard } from "#/modules/shared";
import { DASHBOARD_RECENT_LIMIT, DASHBOARD_ROW_LINK_CLASS } from "../constants";
import type { DashboardOverviewData } from "../hooks";
import { describeImport, formatRelativeTime } from "../utils";
import { DashboardStatusBadge } from "./dashboard-status-badge";
import { DashboardViewAllLink } from "./dashboard-view-all-link";

type DashboardAttentionProps = {
  latestImport: DashboardOverviewData["latestImport"];
  questions: DashboardOverviewData["unansweredQuestions"];
};

// -----
// What needs the owner next: questions the assistant
// could not answer, and a menu import waiting on review.
// -----
export function DashboardAttention({ latestImport, questions }: DashboardAttentionProps) {
  const importNotice = describeImport(latestImport);
  const rows = questions.slice(0, DASHBOARD_RECENT_LIMIT);

  return (
    <PageCard
      title="Needs your attention"
      description="Questions the assistant could not answer, and a menu waiting on you."
      action={<DashboardViewAllLink to="/unanswered" />}
      contentClassName="p-0"
    >
      {latestImport && importNotice ? (
        <Link
          to="/imports/$importId"
          params={{ importId: latestImport.id }}
          className={cn(DASHBOARD_ROW_LINK_CLASS, "items-center justify-between gap-3 border-b")}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">Menu import</p>
            <p className="stat-label">{importNotice.detail}</p>
          </div>
          <DashboardStatusBadge tone={importNotice.tone}>{importNotice.badge}</DashboardStatusBadge>
        </Link>
      ) : null}

      {rows.length === 0 ? (
        <p className="stat-label p-6">Nothing is waiting. The assistant answered everything.</p>
      ) : (
        <ul className="divide-y">
          {rows.map((item) => (
            <li key={item.messageId}>
              <Link
                to="/customers/$threadId"
                params={{ threadId: item.threadId }}
                className={cn(DASHBOARD_ROW_LINK_CLASS, "flex-col gap-1")}
              >
                <p className="truncate text-sm font-medium">{item.question ?? "(no question text)"}</p>
                <p className="stat-label truncate">
                  {item.topics.length > 0 ? item.topics.join(", ") : "No topic"} · {formatRelativeTime(item.askedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageCard>
  );
}
