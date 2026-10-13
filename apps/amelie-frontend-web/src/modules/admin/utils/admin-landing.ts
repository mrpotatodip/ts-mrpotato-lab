export type AdminLandingInput = { isSuperuser: boolean; cafeCount: number };

export type AdminLandingPath = "/overview" | "/admin" | "/no-cafe";

// -----
// Where a signed-in login lands. A cafe means the
// dashboard; no cafe means /admin for a superuser
// and the no-cafe page for everyone else.
// -----
export function resolveAdminLanding({ isSuperuser, cafeCount }: AdminLandingInput): AdminLandingPath {
  if (cafeCount > 0) return "/overview";
  return isSuperuser ? "/admin" : "/no-cafe";
}
