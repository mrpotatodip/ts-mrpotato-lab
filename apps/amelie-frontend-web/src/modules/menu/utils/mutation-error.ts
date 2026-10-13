export const firstMutationError = (
  ...mutations: Array<{ isError: boolean; error: Error | null }>
): string | null => mutations.find((mutation) => mutation.isError)?.error?.message ?? null;
