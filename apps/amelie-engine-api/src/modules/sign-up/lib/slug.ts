import { slugify as slugifyText, withSlugSuffix } from "#/lib/slugify";
import {
  SIGN_UP_RESERVED_SLUGS,
  SIGN_UP_SLUG_FALLBACK,
  SIGN_UP_SLUG_MAX_LENGTH,
} from "#/modules/sign-up/constants";

export const slugify = (name: string): string =>
  slugifyText(name, SIGN_UP_SLUG_MAX_LENGTH, SIGN_UP_SLUG_FALLBACK);

// -----
// The addresses to try, best first: the name,
// then name-2, name-3 ... Each stays within the
// length limit, and a reserved word is skipped.
// -----
export const slugCandidates = (name: string, count: number): string[] => {
  const base = slugify(name);
  const candidates: string[] = [];
  for (let n = 1; candidates.length < count; n++) {
    const candidate = withSlugSuffix(base, n, SIGN_UP_SLUG_MAX_LENGTH);
    if (!SIGN_UP_RESERVED_SLUGS.has(candidate)) candidates.push(candidate);
  }
  return candidates;
};
