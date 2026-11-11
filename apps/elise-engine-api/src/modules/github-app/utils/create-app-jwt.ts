import { GITHUB_APP_JWT_SKEW_S, GITHUB_APP_JWT_TTL_S } from "#/modules/github-app/constants";
import type { GithubAppConfig } from "#/modules/github-app/types";

const PKCS8_BEGIN = "-----BEGIN PRIVATE KEY-----";
const PKCS8_END = "-----END PRIVATE KEY-----";

const base64Url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
type JwtPart = { alg: string; typ: string } | { iat: number; exp: number; iss: string };
const encodeJson = (value: JwtPart): string => base64Url(new TextEncoder().encode(JSON.stringify(value)));

const pemToDer = (pem: string): Uint8Array => {
  const text = pem.replace(/\\n/g, "\n").trim();
  if (!text.startsWith(PKCS8_BEGIN) || !text.endsWith(PKCS8_END)) {
    throw new Error("GITHUB_APP_PRIVATE_KEY must be a PKCS#8 PEM (BEGIN PRIVATE KEY)");
  }
  const body = text.slice(PKCS8_BEGIN.length, text.length - PKCS8_END.length).replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
};

// -----
// The App signs this to prove it is the App. It names no install
// and grants no repo access; it only asks GitHub for a token.
// -----
export const createAppJwt = async (config: GithubAppConfig, nowS: number = Math.floor(Date.now() / 1000)): Promise<string> => {
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(config.privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({ iat: nowS - GITHUB_APP_JWT_SKEW_S, exp: nowS + GITHUB_APP_JWT_TTL_S, iss: config.appId })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
};
