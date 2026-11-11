// -----
// An account's key is encrypted before it is stored: AES-GCM with a
// 256-bit key made from a secret that lives only in the Worker. The
// account's ID is bound in as additional data, so a sealed key copied
// to another account's row does not open. The result is
// "iv.ciphertext" in base64.
// -----
const encoder = new TextEncoder();

const secretKey = async (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", encoder.encode(secret)), "AES-GCM", false, ["encrypt", "decrypt"]);

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

export const sealKey = async (secret: string, accountId: string, apiKey: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(accountId) }, await secretKey(secret), encoder.encode(apiKey));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(sealed))}`;
};

// -----
// Null when the sealed text is damaged, was made with another
// secret, or belongs to another account.
// -----
export const openKey = async (secret: string, accountId: string, sealed: string): Promise<string | null> => {
  const [iv, data] = sealed.split(".");
  if (iv === undefined || data === undefined) return null;
  try {
    const opened = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv), additionalData: encoder.encode(accountId) }, await secretKey(secret), fromBase64(data));
    return new TextDecoder().decode(opened);
  } catch {
    return null;
  }
};
