import { ForbiddenError } from "#/lib/errors";
import { rateLimitByIp } from "#/lib/rate-limit";
import { TEAM_INVITE_INVALID } from "#/modules/team/constants";

// -----
// Over the limit it answers like a wrong token
// (403, same body), so a guesser cannot tell a
// refused token from a refused request.
// -----
export const requireInviteLimit = rateLimitByIp("TEAM_INVITE_LIMITER", () => new ForbiddenError(TEAM_INVITE_INVALID));
