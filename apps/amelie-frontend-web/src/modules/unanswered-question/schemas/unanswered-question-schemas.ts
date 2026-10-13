import { z } from "zod";
import { UnansweredQuestionListSchema } from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const UnansweredQuestionsResponseSchema = apiResponseSchema(UnansweredQuestionListSchema);

export const UnansweredQuestionDismissedResponseSchema = apiResponseSchema(
  z.object({ messageId: z.string() }),
);

export const DismissUnansweredQuestionInputSchema = z.object({ messageId: z.string().min(1) });
