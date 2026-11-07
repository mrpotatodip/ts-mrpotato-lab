// -----
// Code format: 12 characters, shown in groups
// of 4. No 0, O, 1, I or L, so a code read aloud
// or off a screen is not mistaken. 31 symbols
// make about 59 bits.
// -----
const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const INVITE_CODE_LENGTH = 12;
const INVITE_CODE_GROUP_SIZE = 4;
const INVITE_CODE_SEPARATOR_PATTERN = /[\s-]/g;
const INVITE_CODE_BYTE_LIMIT = 256 - (256 % INVITE_CODE_ALPHABET.length);

// -----
// Random bytes at or above the limit are skipped,
// so every symbol is equally likely (no modulo
// bias).
// -----
const randomSymbols = (count: number): string => {
  let symbols = "";
  while (symbols.length < count) {
    for (const byte of crypto.getRandomValues(new Uint8Array(count))) {
      if (byte < INVITE_CODE_BYTE_LIMIT && symbols.length < count) {
        symbols += INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length];
      }
    }
  }
  return symbols;
};

// -----
// "K7M29QXA4TWB" becomes "K7M2-9QXA-4TWB".
// -----
export const formatInviteCode = (symbols: string): string =>
  symbols.match(new RegExp(`.{1,${INVITE_CODE_GROUP_SIZE}}`, "g"))?.join("-") ?? "";

export const generateInviteCode = (): string => formatInviteCode(randomSymbols(INVITE_CODE_LENGTH));

// -----
// " k7m2-9qxa 4twb " becomes "K7M29QXA4TWB".
// -----
export const normalizeInviteCode = (code: string): string => code.replace(INVITE_CODE_SEPARATOR_PATTERN, "").toUpperCase();

const sha256Hex = async (text: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

// -----
// What the database stores and sign-up looks up:
// the hex SHA-256 of the normalised code.
// -----
export const hashInviteCode = (code: string): Promise<string> => sha256Hex(normalizeInviteCode(code));
