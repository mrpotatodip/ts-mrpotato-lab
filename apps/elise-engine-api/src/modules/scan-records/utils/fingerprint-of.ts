export async function fingerprintOf(problemClass: string, file: string | null, title: string): Promise<string> {
  const text = `${problemClass}|${file ?? ""}|${title.trim().toLowerCase().replace(/\s+/g, " ")}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
