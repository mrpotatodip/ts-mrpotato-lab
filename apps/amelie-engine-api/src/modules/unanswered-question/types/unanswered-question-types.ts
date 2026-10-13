export type UnansweredQuestionRow = {
  messageId: string;
  threadId: string;
  question: string | null;
  structure: unknown;
  askedAt: Date;
};

export type UnansweredQuestionWeek = { weekQuestions: number; weekUnanswered: number };
