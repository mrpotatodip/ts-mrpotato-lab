import { useSuspenseQuery } from "@tanstack/react-query";
import type { FilesSearch } from "../schemas";
import { filesQuery } from "./file-queries";

export const useSuspenseFiles = (filters: FilesSearch) => useSuspenseQuery(filesQuery(filters));
