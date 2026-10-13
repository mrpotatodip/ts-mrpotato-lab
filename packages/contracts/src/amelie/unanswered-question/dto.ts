import { z } from "zod";

// -----
// Requests: dismiss one row by its message id
// -----
export const UnansweredQuestionParamSchema = z.object({
  messageId: z.string().min(1),
});

// -----
// Responses: a Customer's question, the Missing
// topics its reply reported, and the week's counts
// -----
export const UnansweredQuestionSchema = z.object({
  messageId: z.string(),
  threadId: z.uuid(),
  question: z.string().nullable(),
  topics: z.array(z.string()),
  askedAt: z.iso.datetime(),
});

export const UnansweredQuestionsSummarySchema = z.object({
  weekQuestions: z.number().int(),
  weekUnanswered: z.number().int(),
});

export const UnansweredQuestionListSchema = z.object({
  summary: UnansweredQuestionsSummarySchema,
  questions: z.array(UnansweredQuestionSchema),
});

export type UnansweredQuestionParam = z.infer<typeof UnansweredQuestionParamSchema>;
export type UnansweredQuestion = z.infer<typeof UnansweredQuestionSchema>;
export type UnansweredQuestionsSummary = z.infer<typeof UnansweredQuestionsSummarySchema>;
export type UnansweredQuestionList = z.infer<typeof UnansweredQuestionListSchema>;
