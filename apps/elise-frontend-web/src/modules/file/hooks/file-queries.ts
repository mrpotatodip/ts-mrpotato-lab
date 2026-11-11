import { queryOptions } from "@tanstack/react-query";
import { fetchFiles } from "../api";
import type { FilesSearch } from "../schemas";

export const fileKeys = {
  all: ["files"] as const,
  list: (filters: FilesSearch) => [...fileKeys.all, "list", filters] as const,
};

export const filesQuery = (filters: FilesSearch) =>
  queryOptions({
    queryKey: fileKeys.list(filters),
    queryFn: () => fetchFiles({ data: { filters } }),
  });
