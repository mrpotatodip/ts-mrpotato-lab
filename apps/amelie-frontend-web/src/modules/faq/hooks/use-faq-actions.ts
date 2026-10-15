import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FaqList } from "@repo/contracts/amelie";
import { optimisticEdit } from "#/lib/optimistic-cache";
import {
  addFaq,
  addFaqCategory,
  deleteFaq,
  deleteFaqCategory,
  renameFaqCategory,
  updateFaq,
} from "../api";
import { withCategoryRenamed } from "../utils";
import { faqsKeys } from "./use-faqs";

// -----
// Every change reloads the list: deleting a
// category also moves its FAQs to General.
// -----
export function useFaqActions() {
  const queryClient = useQueryClient();
  const reload = () => queryClient.invalidateQueries({ queryKey: faqsKeys.all });

  const add = useMutation({ mutationFn: addFaq, onSuccess: reload, meta: { successMessage: "FAQ added" } });
  const update = useMutation({ mutationFn: updateFaq, onSuccess: reload, meta: { successMessage: "FAQ saved" } });
  const remove = useMutation({ mutationFn: deleteFaq, onSuccess: reload, meta: { successMessage: "FAQ deleted" } });
  const addCategory = useMutation({ mutationFn: addFaqCategory, onSuccess: reload, meta: { successMessage: "Category added" } });
  const renameCategory = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: faqsKeys.all,
      mutationFn: renameFaqCategory,
      applyEdit: (list: FaqList, { data }) => withCategoryRenamed(list, data.categoryId, data.name),
      settle: reload,
      meta: { successMessage: "Category renamed" },
    }),
  );
  const removeCategory = useMutation({ mutationFn: deleteFaqCategory, onSuccess: reload, meta: { successMessage: "Category deleted" } });

  return { add, update, remove, addCategory, renameCategory, removeCategory };
}
