import type { QueryClient, QueryKey, UseMutationOptions } from "@tanstack/react-query";

export type CacheSnapshot<TData> = ReadonlyArray<readonly [QueryKey, TData | undefined]>;

export async function snapshotQueries<TData>(queryClient: QueryClient, queryKey: QueryKey): Promise<CacheSnapshot<TData>> {
  await queryClient.cancelQueries({ queryKey });
  return queryClient.getQueriesData<TData>({ queryKey });
}

export function restoreQueries<TData>(queryClient: QueryClient, snapshot: CacheSnapshot<TData> | undefined): void {
  for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data);
}

type OptimisticEditOptions<TData, TResult, TInput> = {
  queryClient: QueryClient;
  queryKey: QueryKey;
  mutationFn: (input: TInput) => Promise<TResult>;
  applyEdit: (data: TData, input: TInput) => TData;
  settle: () => Promise<void>;
  meta?: UseMutationOptions<TResult, Error, TInput>["meta"];
};

type OptimisticContext<TData> = { previous: CacheSnapshot<TData> };

export function optimisticEdit<TData, TResult, TInput>({
  queryClient,
  queryKey,
  mutationFn,
  applyEdit,
  settle,
  meta,
}: OptimisticEditOptions<TData, TResult, TInput>): UseMutationOptions<TResult, Error, TInput, OptimisticContext<TData>> {
  return {
    mutationFn,
    meta,
    onMutate: async (input) => {
      const previous = await snapshotQueries<TData>(queryClient, queryKey);
      queryClient.setQueriesData<TData>({ queryKey }, (data) => (data ? applyEdit(data, input) : data));
      return { previous };
    },
    onError: (_error, _input, context) => restoreQueries(queryClient, context?.previous),
    onSettled: settle,
  };
}
