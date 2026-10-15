export function toCustomerChatInk(accent: string): string {
  const n = Number.parseInt(accent.slice(1), 16);
  if (Number.isNaN(n)) return "#fff";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 160 ? "#171717" : "#fff";
}
