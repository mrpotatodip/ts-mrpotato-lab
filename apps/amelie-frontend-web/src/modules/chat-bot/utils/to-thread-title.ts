// -----
// Stored Title, or Chat when the thread
// has not been named yet.
// -----
export function toThreadTitle(title: string | null): string {
  const trimmed = title?.trim();
  return trimmed || "Chat";
}
