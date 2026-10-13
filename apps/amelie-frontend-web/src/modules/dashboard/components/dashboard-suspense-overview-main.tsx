import { CircleQuestionMark, MessageSquareWarning, MessagesSquare, UtensilsCrossed } from "lucide-react";
import { Suspense } from "react";

import { useSuspenseDashboardOverview } from "../hooks";
import { DashboardActivityChart } from "./dashboard-activity-chart";
import { DashboardAttention } from "./dashboard-attention";
import { DashboardOverviewSkeleton } from "./dashboard-overview-skeleton";
import { PageHeader } from "#/modules/shared";
import { DashboardRecentThreads } from "./dashboard-recent-threads";
import { DashboardSetupChecklist } from "./dashboard-setup-checklist";
import { DashboardStatCard } from "./dashboard-stat-card";

// -----
// The first screen after sign-in: four numbers, the week's
// chats, then what to read and what to fix. The header
// shows at once; the rest waits behind the skeleton.
// -----
export function DashboardSuspenseOverviewMain() {
  return (
    <>
      <PageHeader title="Overview" description="How the assistant is doing for your cafe." />
      <Suspense fallback={<DashboardOverviewSkeleton />}>
        <DashboardOverviewView />
      </Suspense>
    </>
  );
}

function DashboardOverviewView() {
  const overview = useSuspenseDashboardOverview();
  const { unansweredSummary: summary } = overview;

  return (
    <>
      <div className="dashboard-grid">
        <DashboardStatCard
          label="Chats this week"
          value={overview.weekChats}
          hint="Customers who talked to the assistant"
          icon={MessagesSquare}
          to="/customers"
        />
        <DashboardStatCard
          label="Needs information"
          value={summary.weekUnanswered}
          hint={`of ${summary.weekQuestions} questions this week`}
          icon={MessageSquareWarning}
          to="/unanswered"
        />
        <DashboardStatCard
          label="Menu items"
          value={overview.menuItemCount}
          hint={overview.soldOutCount > 0 ? `${overview.soldOutCount} marked unavailable` : "All available"}
          icon={UtensilsCrossed}
          to="/menu"
        />
        <DashboardStatCard
          label="FAQs"
          value={overview.faqCount}
          hint={`${overview.faqCategoryCount} categories`}
          icon={CircleQuestionMark}
          to="/faqs"
        />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <div className="space-y-8">
          <DashboardSetupChecklist checklist={overview.checklist} />
          <DashboardAttention latestImport={overview.latestImport} questions={overview.unansweredQuestions} />
        </div>
        <div className="space-y-8">
          <DashboardActivityChart activity={overview.activity} weekChats={overview.weekChats} />
          <DashboardRecentThreads threads={overview.recentThreads} />
        </div>
      </div>
    </>
  );
}
