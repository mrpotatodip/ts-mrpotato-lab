export const PUBLIC_CHAT_MESSAGE_MAX_LENGTH = 500;

// -----
// Sign-up: limits the form and the server share
// -----
export const SIGN_UP_INVITE_CODE_MAX = 128;
export const SIGN_UP_PERSON_NAME_MAX = 60;
export const SIGN_UP_ACCOUNT_NAME_MAX = 80;
export const SIGN_UP_EMAIL_MAX = 254;
export const SIGN_UP_PASSWORD_MIN = 8;
export const SIGN_UP_PASSWORD_MAX = 128;
export const SIGN_UP_WEBSITE_MAX = 2048;

// -----
// Invite codes: limits the admin form and the server share
// -----
export const INVITE_CODE_NOTE_MAX = 200;
export const INVITE_CODE_MAX_USES_DEFAULT = 1;
export const INVITE_CODE_MAX_USES_LIMIT = 1000;

export const TEAM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TEAM_INVITE_TOKEN_BYTES = 32;
