import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { DismissUnansweredQuestionInputSchema, UnansweredQuestionDismissedResponseSchema } from "../schemas";

export const dismissUnansweredQuestion = createServerFn({ method: "POST" })
  .validator(DismissUnansweredQuestionInputSchema)
  .handler(async ({ data: { messageId } }) => {
    const { data, error } = await tryCatch(
      apiClient.post(
        await withActiveTenant(`/unanswered-questions/${encodeURIComponent(messageId)}/dismiss`),
        UnansweredQuestionDismissedResponseSchema,
      ),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to dismiss");
    }

    if (!data.data) {
      throw new Error("Failed to dismiss");
    }

    return data.data;
  });
