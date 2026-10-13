import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "#/components/ui/chart";
import { PageCard } from "#/modules/shared";
import { DASHBOARD_ACTIVITY_DAYS } from "../constants";
import type { DashboardOverviewData } from "../hooks";

const CHART_CONFIG = {
  count: { label: "Chats", color: "var(--chart-1)" },
} satisfies ChartConfig;

type DashboardActivityChartProps = {
  activity: DashboardOverviewData["activity"];
  weekChats: number;
};

// -----
// Chats started each day this week, so a quiet or
// busy stretch shows before the owner reads a single chat.
// -----
export function DashboardActivityChart({ activity, weekChats }: DashboardActivityChartProps) {
  return (
    <PageCard
      title="Chats this week"
      description={`Last ${DASHBOARD_ACTIVITY_DAYS} days`}
      action={<span className="stat-value">{weekChats}</span>}
    >
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-56 w-full">
        <BarChart data={activity} margin={{ left: 0, right: 0, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={6} />
        </BarChart>
      </ChartContainer>
    </PageCard>
  );
}
