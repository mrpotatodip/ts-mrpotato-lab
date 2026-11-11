import { sha256Hex } from "@repo/db-elise";
import { RUNNER_TOKEN_BYTES } from "@repo/contracts/elise";
import { RUNNER_PAIRING_ALPHABET, RUNNER_PAIRING_CODE_LENGTH, RUNNER_TOKEN_PREFIX } from "#/modules/runners/constants";

const GROUP = RUNNER_PAIRING_CODE_LENGTH / 2;

// -----
// The alphabet has 32 characters, so a random byte
// modulo 32 is unbiased. The code reads as two groups
// of four: XXXX-XXXX.
// -----
export const generatePairingCode = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(RUNNER_PAIRING_CODE_LENGTH));
  const chars = Array.from(bytes, (byte) => RUNNER_PAIRING_ALPHABET.charAt(byte % RUNNER_PAIRING_ALPHABET.length)).join("");
  return `${chars.slice(0, GROUP)}-${chars.slice(GROUP)}`;
};

// -----
// What a person types may use lower case, spaces or no
// dash. The hash is of this form, so every spelling of
// one code finds the same row.
// -----
export const normalizePairingCode = (input: string): string => input.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const hashPairingCode = (code: string): Promise<string> => sha256Hex(normalizePairingCode(code));

// -----
// 32 random bytes as base64url. Only the hash is
// stored, so a leaked table cannot act as a Runner.
// -----
export const generateRunnerToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(RUNNER_TOKEN_BYTES));
  return RUNNER_TOKEN_PREFIX + btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const hashRunnerToken = (token: string): Promise<string> => sha256Hex(token);

// -----
// The token of an `Authorization: Bearer <token>`
// header, or null when the header is not that.
// -----
export const bearerTokenOf = (header: string | undefined): string | null => {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
};
