import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { UnansweredQuestionsResponseSchema } from "../schemas";

export const fetchUnansweredQuestions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await tryCatch(
    apiClient.get(await withActiveTenant("/unanswered-questions"), UnansweredQuestionsResponseSchema),
  );

  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load unanswered questions");
  }

  if (!data.data) {
    throw new Error("Failed to load unanswered questions");
  }

  return data.data;
});
