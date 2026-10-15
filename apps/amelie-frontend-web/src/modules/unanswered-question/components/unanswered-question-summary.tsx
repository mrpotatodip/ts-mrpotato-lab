import type { UnansweredQuestionsSummary } from "@repo/contracts/amelie";

import { unansweredWeekCopy } from "../utils";

type UnansweredQuestionSummaryProps = {
  summary: UnansweredQuestionsSummary;
};

// -----
// "37 questions this week, 6 need information":
// the week is the Tenant's last 7 days.
// -----
export function UnansweredQuestionSummary({ summary }: UnansweredQuestionSummaryProps) {
  const { lead, need } = unansweredWeekCopy(summary.weekQuestions, summary.weekUnanswered);
  return (
    <p className="text-muted-foreground text-sm">
      {lead}, <span className="text-foreground font-medium">{need}</span>.
    </p>
  );
}
