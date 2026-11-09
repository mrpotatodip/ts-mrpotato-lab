import type { FilesInput } from "../schemas";

// -----
// A day in the filter covers the whole day, in UTC.
// -----
export function fileQueryString({ filters, cursor }: FilesInput): string {
  const params = new URLSearchParams();
  if (filters.repoId) params.set("repoId", filters.repoId);
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.name) params.set("name", filters.name);
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", `${filters.from}T00:00:00.000Z`);
  if (filters.to) params.set("to", `${filters.to}T23:59:59.999Z`);
  if (cursor) params.set("cursor", cursor);
  const text = params.toString();
  return text ? `?${text}` : "";
}
