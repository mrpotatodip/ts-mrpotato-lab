import { sha256Hex } from "@repo/db-elise";
import { TEAM_INVITE_TOKEN_BYTES } from "@repo/contracts/elise";

// -----
// 32 random bytes as base64url. Only the hash is
// stored, so a leaked table cannot be used to
// accept an invite.
// -----
export const generateInviteToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(TEAM_INVITE_TOKEN_BYTES));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const hashInviteToken = (token: string): Promise<string> => sha256Hex(token);
