import type { UnansweredQuestionList } from "@repo/contracts/amelie";

export const withoutQuestion = (list: UnansweredQuestionList, messageId: string): UnansweredQuestionList => ({
  ...list,
  questions: list.questions.filter((question) => question.messageId !== messageId),
});
