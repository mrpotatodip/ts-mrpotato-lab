const toOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

// -----
// Only a listed website may call; no Origin
// header, or "null", is never allowed.
// -----
export const isPublicChatOriginAllowed = (
  origin: string | undefined,
  allowedOrigins: ReadonlyArray<string>,
): boolean => {
  const caller = origin ? toOrigin(origin) : null;
  if (!caller) return false;
  return allowedOrigins.some((allowed) => toOrigin(allowed.trim()) === caller);
};
