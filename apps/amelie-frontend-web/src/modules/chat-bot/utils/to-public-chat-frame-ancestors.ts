const originOf = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export function toPublicChatFrameAncestors(allowedOrigins: readonly string[]): string {
  const origins = [...new Set(allowedOrigins.flatMap((value) => {
    const origin = originOf(value.trim());
    return origin ? [origin] : [];
  }))];
  if (origins.length === 0) return "frame-ancestors 'none'";
  return `frame-ancestors ${origins.join(" ")}`;
}

export async function publicChatContentSecurityPolicy(
  slug: string,
  loadOrigins: (slug: string) => Promise<readonly string[] | null>,
): Promise<string> {
  try {
    const origins = await loadOrigins(slug);
    if (origins == null) return "frame-ancestors 'none'";
    return toPublicChatFrameAncestors(origins);
  } catch {
    return "frame-ancestors 'none'";
  }
}
