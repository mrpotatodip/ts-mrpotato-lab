import { CUSTOMER_CHAT_LABEL_DEFAULT } from "@repo/contracts/amelie";

const ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_BUBBLE = "#171717";
const DEFAULT_INK = "#fff";

export type WidgetBubbleLook = {
  label: string;
  background: string;
  color: string;
};

export function toWidgetBubbleLook(label: string, accent: string | null): WidgetBubbleLook {
  const text = label.trim() || CUSTOMER_CHAT_LABEL_DEFAULT;
  if (accent && ACCENT_PATTERN.test(accent)) {
    return { label: text, background: accent, color: toWidgetBubbleInk(accent) };
  }
  return { label: text, background: DEFAULT_BUBBLE, color: DEFAULT_INK };
}

function toWidgetBubbleInk(accent: string): string {
  const n = Number.parseInt(accent.slice(1), 16);
  if (Number.isNaN(n)) return DEFAULT_INK;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 >= 160 ? "#171717" : DEFAULT_INK;
}
