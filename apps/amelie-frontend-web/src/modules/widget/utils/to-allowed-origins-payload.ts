export function toAllowedOriginsPayload(rows: readonly string[]): string[] {
  return rows.map((row) => row.trim()).filter((row) => row.length > 0);
}
