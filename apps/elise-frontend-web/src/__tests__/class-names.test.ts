import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");
const LITERAL = /"([^"\n]*\bline-clamp-\d[^"\n]*)"|`([^`]*\bline-clamp-\d[^`]*)`/g;
const DISPLAY = new Set(["block", "flex", "inline-flex", "inline-block", "grid", "inline-grid", "table", "contents"]);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });

// -----
// line-clamp sets its own display, so a plain display class in the same string undoes the clamp
// and the text runs to its full length.
// -----
const clampedAndDisplayed = (source: string) =>
  [...source.matchAll(LITERAL)]
    .map((match) => match[1] ?? match[2] ?? "")
    .filter((classes) => {
      const tokens = classes.split(/\s+/);
      return tokens.some((token) => /^line-clamp-\d/.test(token)) && tokens.some((token) => DISPLAY.has(token));
    });

const INK_FILL = /\b(?:bg|stroke|fill)-(?:status-(?:success|danger|warning|info|neutral)|severity-(?:critical|high|medium|low|informational))(?:\/(\d+))?(?![\w-])/g;
const TINT_ALPHA = 30;

// -----
// A status or severity colour that carries text is an ink: dark in the light themes so it clears 4.5:1.
// Filling a bar, ring or dot with an ink makes it muddy against the sky, so shapes use the mark tokens
// (`bg-mark-*`). A faint tint behind its own text (an alpha under 30, as on a badge) is fine.
// -----
const inkFills = (source: string) =>
  [...source.matchAll(INK_FILL)]
    .filter((match) => match[1] === undefined || Number(match[1]) >= TINT_ALPHA)
    .map((match) => match[0]);

describe("class names", () => {
  it.each(sourceFiles(SRC))("%s fills no shape with a status or severity ink", (file) => {
    expect(inkFills(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("catches an ink used as a fill, and lets a faint tint through", () => {
    expect(inkFills(`<span className="bg-status-success/70" />`)).toEqual(["bg-status-success/70"]);
    expect(inkFills(`<circle className="stroke-status-success" />`)).toEqual(["stroke-status-success"]);
    expect(inkFills(`<span className="bg-severity-high/12 text-severity-high" />`)).toEqual([]);
    expect(inkFills(`<span className="bg-status-danger-soft bg-mark-danger" />`)).toEqual([]);
  });

  it.each(sourceFiles(SRC))("%s never sets a display class beside line-clamp", (file) => {
    expect(clampedAndDisplayed(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("catches the clamp that a display class cancels", () => {
    expect(clampedAndDisplayed(`<span className="mt-1 line-clamp-2 block text-sm" />`)).toHaveLength(1);
    expect(clampedAndDisplayed(`<span className="mt-1 line-clamp-2 text-sm" />`)).toHaveLength(0);
  });
});
