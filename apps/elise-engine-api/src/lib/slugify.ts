const trimHyphens = (text: string): string => text.replace(/^-+|-+$/g, "");

// -----
// "Café Crème & Co." becomes "cafe-creme-co".
// -----
export const slugify = (name: string, maxLength: number, fallback: string): string => {
  const slug = trimHyphens(
    name
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
  );
  return trimHyphens(slug.slice(0, maxLength)) || fallback;
};

// -----
// The nth try at a slug: the base, then
// base-2, base-3 ... within the length limit.
// -----
export const withSlugSuffix = (base: string, n: number, maxLength: number): string => {
  if (n === 1) return base;
  const suffix = `-${n}`;
  return `${trimHyphens(base.slice(0, maxLength - suffix.length))}${suffix}`;
};
