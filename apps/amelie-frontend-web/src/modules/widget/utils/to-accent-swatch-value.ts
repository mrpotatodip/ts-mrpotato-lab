// -----
// Light --primary in globals.css: oklch(0.58 0.09 30).
// -----
const FALLBACK_PRIMARY_SWATCH = "#a9655a";

export function toAccentSwatchValue(accent: string | null): string {
  if (accent) return accent;
  if (typeof document === "undefined") return FALLBACK_PRIMARY_SWATCH;
  const probe = document.createElement("span");
  probe.style.color = "var(--primary)";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const hex = cssColorToHex(computed);
  return hex && hex !== "#000000" ? hex : FALLBACK_PRIMARY_SWATCH;
}

function cssColorToHex(css: string): string | null {
  const oklch = css.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (oklch) return oklchToHex(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
  const fromRgb = rgbToHex(css);
  if (fromRgb) return fromRgb;
  if (css.startsWith("#") && (css.length === 7 || css.length === 4)) return expandHex(css);
  return null;
}

function toSrgb(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const hex = (x: number) => Math.round(toSrgb(x) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

function expandHex(hex: string): string {
  if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  return hex.slice(0, 7);
}

function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!match) return null;
  return `#${[match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}
