// -----
// "37 questions this week, 6 need information":
// the week is the Tenant's last 7 days.
// -----
export function unansweredWeekCopy(weekQuestions: number, weekUnanswered: number) {
  const questionWord = weekQuestions === 1 ? "question" : "questions";
  const needWord = weekUnanswered === 1 ? "needs" : "need";
  return {
    lead: `${weekQuestions} ${questionWord} in the last 7 days`,
    need: `${weekUnanswered} ${needWord} information`,
  };
}
