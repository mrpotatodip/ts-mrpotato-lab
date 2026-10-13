import { API_BASE_URL } from "#/lib/api-base-url";

export const toMenuItemImageUrl = (coverPath: string | null): string | null => {
  if (!coverPath) return null;
  return `${API_BASE_URL}${coverPath.startsWith("/") ? coverPath : `/${coverPath}`}`;
};
