const RSA = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" } as const;

const base64Bytes = (text: string): Uint8Array => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));

// -----
// A throwaway RSA key in the shape the App Secret has: PKCS#8 PEM.
// verify checks an RS256 signature against its public half.
// -----
export const makeRsaKey = async () => {
  const pair = await crypto.subtle.generateKey(RSA, true, ["sign", "verify"]);
  if (!("privateKey" in pair)) throw new Error("no key pair");
  const der = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  if (!(der instanceof ArrayBuffer)) throw new Error("no PKCS#8 export");
  const body = btoa(String.fromCharCode(...new Uint8Array(der))).replace(/(.{64})/g, "$1\n");
  return {
    pem: `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`,
    verify: (signed: string, signature: string): Promise<boolean> =>
      crypto.subtle.verify("RSASSA-PKCS1-v1_5", pair.publicKey, base64Bytes(signature), new TextEncoder().encode(signed)),
  };
};

export const decodeBase64UrlJson = (text: string) => JSON.parse(new TextDecoder().decode(base64Bytes(text)));
