import { ForbiddenError } from "#/lib/errors";
import { rateLimitByIp } from "#/lib/rate-limit";
import { RUNNER_PAIRING_INVALID } from "#/modules/runners/constants";

// -----
// Over the limit it answers like a wrong code (403, same
// body), so a guesser cannot tell a refused code from a
// refused request.
// -----
export const requireEnrollLimit = rateLimitByIp("RUNNER_ENROLL_LIMITER", () => new ForbiddenError(RUNNER_PAIRING_INVALID));
