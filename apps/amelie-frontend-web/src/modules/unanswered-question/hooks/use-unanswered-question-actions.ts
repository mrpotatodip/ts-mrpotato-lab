import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UnansweredQuestionList } from "@repo/contracts/amelie";
import { optimisticEdit } from "#/lib/optimistic-cache";
import { dismissUnansweredQuestion } from "../api";
import { withoutQuestion } from "../utils";
import { unansweredQuestionsKeys } from "./use-unanswered-questions";

export function useUnansweredQuestionActions() {
  const queryClient = useQueryClient();

  const dismiss = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: unansweredQuestionsKeys.all,
      mutationFn: (messageId: string) => dismissUnansweredQuestion({ data: { messageId } }),
      applyEdit: (list: UnansweredQuestionList, messageId) => withoutQuestion(list, messageId),
      settle: () => queryClient.invalidateQueries({ queryKey: unansweredQuestionsKeys.all }),
    }),
  );

  return { dismiss };
}
