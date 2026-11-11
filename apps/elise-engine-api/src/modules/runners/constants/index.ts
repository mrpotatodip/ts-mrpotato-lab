// -----
// Messages. A refused pairing code always reads the
// same, so a guesser cannot tell a wrong code from an
// expired or used one.
// -----
export const RUNNER_PAIRING_INVALID = "This pairing code is invalid or has expired";

// -----
// A pairing code is 8 characters from an alphabet with
// no 0, 1, I or O, shown as two groups of four. A token
// starts with a prefix, so a leaked one is easy to find.
// -----
export const RUNNER_PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RUNNER_PAIRING_CODE_LENGTH = 8;
export const RUNNER_TOKEN_PREFIX = "elr_";
