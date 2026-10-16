import { TEAM_INVITE_TOKEN_BYTES } from "@repo/contracts/amelie";

export const generateTeamInviteToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(TEAM_INVITE_TOKEN_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const hashTeamInviteToken = async (token: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
