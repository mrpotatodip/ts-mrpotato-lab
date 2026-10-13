import type { UnansweredQuestionsSummary } from "@repo/contracts/amelie";

type UnansweredQuestionSummaryProps = {
  summary: UnansweredQuestionsSummary;
};

// -----
// "37 questions this week, 6 need information":
// the week is the Tenant's last 7 days.
// -----
export function UnansweredQuestionSummary({ summary }: UnansweredQuestionSummaryProps) {
  const { weekQuestions, weekUnanswered } = summary;
  return (
    <p className="text-muted-foreground text-sm">
      {weekQuestions} {weekQuestions === 1 ? "question" : "questions"} in the last 7 days,{" "}
      <span className="text-foreground font-medium">{weekUnanswered} need information</span>.
    </p>
  );
}
