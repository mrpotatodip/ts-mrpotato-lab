import { z } from "zod";
import { GITHUB_INSTALL_STATE_PURPOSE } from "#/modules/github-installs/constants";

const InstallStateSchema = z.object({ accountId: z.string(), userId: z.string(), nonce: z.string(), expiresAt: z.number() });

export type InstallState = z.infer<typeof InstallStateSchema>;

const toBase64Url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string): Uint8Array => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
const hmacKey = (secret: string) => crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
const signedText = (payload: string): Uint8Array => new TextEncoder().encode(`${GITHUB_INSTALL_STATE_PURPOSE}.${payload}`);

// -----
// The state sent to GitHub and read back: the account, the admin who
// started the install, and when it stops being good. It is signed with
// the server's secret, so a person cannot make one for another account.
// -----
export const signInstallState = async (secret: string, state: InstallState): Promise<string> => {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(state)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), signedText(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
};

// -----
// Null for anything that is not a good, unexpired state of ours:
// the caller treats every kind of bad state the same way.
// -----
export const readInstallState = async (secret: string, token: string, nowMs: number): Promise<InstallState | null> => {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  try {
    if (!(await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64Url(signature), signedText(payload)))) return null;
    const state = InstallStateSchema.safeParse(JSON.parse(new TextDecoder().decode(fromBase64Url(payload))));
    return state.success && state.data.expiresAt > nowMs ? state.data : null;
  } catch {
    return null;
  }
};
