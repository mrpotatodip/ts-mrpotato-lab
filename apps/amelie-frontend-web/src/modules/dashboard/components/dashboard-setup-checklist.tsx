import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { cn } from "#/lib/utils";
import { PageCard } from "#/modules/shared";
import { DASHBOARD_ROW_LINK_CLASS } from "../constants";
import type { DashboardOverviewData } from "../hooks";
import { isChecklistComplete } from "../utils";

type DashboardSetupChecklistProps = {
  checklist: DashboardOverviewData["checklist"];
};

// -----
// "Get your cafe ready": shown to a new cafe until all
// four steps are done, then it goes away.
// -----
export function DashboardSetupChecklist({ checklist }: DashboardSetupChecklistProps) {
  if (isChecklistComplete(checklist)) return null;

  const doneCount = checklist.filter((step) => step.done).length;

  return (
    <PageCard
      title="Get your cafe ready"
      description={`${doneCount} of ${checklist.length} done`}
      contentClassName="p-0"
    >
      <ul className="divide-y">
        {checklist.map((step) => (
          <li key={step.id}>
            <Link to={step.to} className={cn(DASHBOARD_ROW_LINK_CLASS, "items-center gap-3")}>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  step.done && "bg-primary border-primary text-primary-foreground",
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-3" /> : null}
              </span>
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                  {step.label}
                </p>
                <p className="stat-label">{step.hint}</p>
              </div>
              <span className="sr-only">{step.done ? "Done" : "Not done"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageCard>
  );
}
