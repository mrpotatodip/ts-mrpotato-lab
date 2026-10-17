const EXACT_ONLY_PATHS: readonly string[] = ["/admin"];

// -----
// A nav item is active on its own path and below it,
// except /admin, which only owns the invite codes page
// and not the screens that live under it.
// -----
export function isDashboardNavActive(pathname: string, to: string): boolean {
  if (pathname === to) return true;
  return !EXACT_ONLY_PATHS.includes(to) && pathname.startsWith(`${to}/`);
}

// -----
// The screen a path belongs to: the longest nav path
// that is active.
// -----
export function findDashboardNavItem<T extends { to: string }>(pathname: string, items: readonly T[]): T | undefined {
  return items
    .filter((item) => isDashboardNavActive(pathname, item.to))
    .toSorted((a, b) => b.to.length - a.to.length)[0];
}
