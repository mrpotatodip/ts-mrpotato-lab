import { MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";

export type MutationToastMeta = {
  successMessage?: string | false;
  errorMessage?: string | false;
};

export type ActionToaster = {
  success: (message: string) => void;
  error: (message: string) => void;
};

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: MutationToastMeta;
  }
}

export const sonnerActionToaster: ActionToaster = {
  success: (message) => {
    toast.success(message);
  },
  error: (message) => {
    toast.error(message);
  },
};

export function toastMutationSuccess(meta: MutationToastMeta | undefined, toaster: ActionToaster): void {
  const message = meta?.successMessage;
  if (message === false) return;
  toaster.success(message ?? "Saved");
}

export function toastMutationError(error: Error, meta: MutationToastMeta | undefined, toaster: ActionToaster): void {
  const message = meta?.errorMessage;
  if (message === false) return;
  toaster.error(message ?? error.message);
}

export function createMutationToastCache(toaster: ActionToaster = sonnerActionToaster): MutationCache {
  return new MutationCache({
    onSuccess: (_data, _variables, _onMutateResult, mutation) => {
      toastMutationSuccess(mutation.meta, toaster);
    },
    onError: (error: Error, _variables, _onMutateResult, mutation) => {
      toastMutationError(error, mutation.meta, toaster);
    },
  });
}
