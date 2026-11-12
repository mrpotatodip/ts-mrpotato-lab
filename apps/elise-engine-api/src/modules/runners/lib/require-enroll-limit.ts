import { ForbiddenError } from "#/lib/errors";
import { rateLimitByIp, rateLimitTotal } from "#/lib/rate-limit";
import { RUNNER_PAIRING_INVALID } from "#/modules/runners/constants";

const refuse = () => new ForbiddenError(RUNNER_PAIRING_INVALID);

// -----
// Over either limit it answers like a wrong code (403,
// same body), so a guesser cannot tell a refused code
// from a refused request. The count per IP comes first,
// so one noisy address does not use up the total. The
// total counts every attempt, so many addresses share
// one limit: a guess that matches any live code pairs,
// and the number of tries a minute is what bounds it.
// -----
export const requireEnrollLimit = rateLimitByIp("RUNNER_ENROLL_LIMITER", refuse);
export const requireEnrollTotalLimit = rateLimitTotal("RUNNER_ENROLL_TOTAL_LIMITER", refuse);
