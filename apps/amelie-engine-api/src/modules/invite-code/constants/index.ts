// -----
// Messages
// -----
export const INVITE_CODE_NOT_FOUND = "Invite code not found";
export const INVITE_CODE_CREATOR_UNKNOWN = "Unknown";

// -----
// Code format: 12 characters, shown in groups
// of 4. No 0, O, 1, I or L, so a code read aloud
// or off a screen is not mistaken. 31 symbols
// make about 59 bits.
// -----
export const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const INVITE_CODE_LENGTH = 12;
export const INVITE_CODE_GROUP_SIZE = 4;
export const INVITE_CODE_SEPARATOR_PATTERN = /[\s-]/g;
export const INVITE_CODE_BYTE_LIMIT = 256 - (256 % INVITE_CODE_ALPHABET.length);
