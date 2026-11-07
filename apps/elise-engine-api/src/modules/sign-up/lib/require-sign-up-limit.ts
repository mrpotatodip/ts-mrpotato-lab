import { ForbiddenError } from "#/lib/errors";
import { rateLimitByIp } from "#/lib/rate-limit";
import { SIGN_UP_INVALID_INVITE } from "#/modules/sign-up/constants";

// -----
// Over the limit it answers exactly like a wrong
// invite code (403, same body), so a guesser cannot
// tell a refused code from a refused request.
// -----
export const requireSignUpLimit = rateLimitByIp("SIGN_UP_LIMITER", () => new ForbiddenError(SIGN_UP_INVALID_INVITE));
