// -----
// The policy: how many open problems of a severity a commit
// may have and still pass. One default for every account.
// An open problem with no severity yet (needs validation)
// is never allowed.
// -----
export const VERDICT_LIMITS = { critical: 0, high: 0, medium: 3 } as const;

// -----
// Scans of a commit that count as one look at it. More scans
// make the verdict stricter, never softer, so a flaky agent
// cannot pass a commit by luck.
// -----
export const VERDICT_SCAN_FETCH_LIMIT = 20;
