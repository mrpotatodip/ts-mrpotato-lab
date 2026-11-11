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
// and the text runs to its full length. Whole-line comments are dropped first, because a backtick
// in a comment pairs with one in code and makes the match span unrelated lines. A failure shows
// the first 120 characters of the match, not all of it.
// -----
const withoutLineComments = (source: string) => source.replace(/^[ \t]*\/\/.*$/gm, "");

const clampedAndDisplayed = (source: string) =>
  [...withoutLineComments(source).matchAll(LITERAL)]
    .map((match) => match[1] ?? match[2] ?? "")
    .filter((classes) => {
      const tokens = classes.split(/\s+/);
      return tokens.some((token) => /^line-clamp-\d/.test(token)) && tokens.some((token) => DISPLAY.has(token));
    })
    .map((classes) => classes.slice(0, 120));

const SR_LITERAL = /"([^"\n]*\b(?:sm|md|lg|xl):not-sr-only[^"\n]*)"|`([^`]*\b(?:sm|md|lg|xl):not-sr-only[^`]*)`/g;

// -----
// not-sr-only resets white-space to normal from its breakpoint up, and the page breaks words anywhere,
// so a label shown that way splits mid-word unless the same breakpoint sets whitespace-nowrap again.
// -----
const unpinnedSrLabels = (source: string) =>
  [...source.matchAll(SR_LITERAL)]
    .map((match) => match[1] ?? match[2] ?? "")
    .filter((classes) => {
      const tokens = classes.split(/\s+/);
      return tokens
        .map((token) => /^(sm|md|lg|xl):not-sr-only$/.exec(token)?.[1])
        .filter((breakpoint) => breakpoint !== undefined)
        .some((breakpoint) => !tokens.includes(`${breakpoint}:whitespace-nowrap`));
    });

const INK_FILL =/\b(?:bg|stroke|fill)-(?:status-(?:success|danger|warning|info|neutral)|severity-(?:critical|high|medium|low|informational))(?:\/(\d+))?(?![\w-])/g;
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

  it.each(sourceFiles(SRC))("%s pins white-space on a label that sr-only shows from a breakpoint", (file) => {
    expect(unpinnedSrLabels(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("catches a shown label that can break mid-word, and lets a pinned one through", () => {
    expect(unpinnedSrLabels(`<span className="sr-only sm:not-sr-only" />`)).toHaveLength(1);
    expect(unpinnedSrLabels(`<span className="sr-only whitespace-nowrap sm:not-sr-only" />`)).toHaveLength(1);
    expect(unpinnedSrLabels(`<span className="sr-only sm:not-sr-only sm:whitespace-nowrap" />`)).toHaveLength(0);
    expect(unpinnedSrLabels(`<a className="sr-only focus:not-sr-only" />`)).toHaveLength(0);
  });

  it("catches the clamp that a display class cancels", () => {
    expect(clampedAndDisplayed(`<span className="mt-1 line-clamp-2 block text-sm" />`)).toHaveLength(1);
    expect(clampedAndDisplayed(`<span className="mt-1 line-clamp-2 text-sm" />`)).toHaveLength(0);
  });

  it("is not fooled by a backtick in a comment", () => {
    const source = ["// the `collapsed` list", `const a = "x";`, "const b = `y ${z} line-clamp-2 block`;"].join("\n");

    expect(clampedAndDisplayed(source)).toHaveLength(1);
    expect(clampedAndDisplayed(["// a `note`", `<span className="line-clamp-2 text-sm" />`, "const c = `ok`;"].join("\n"))).toHaveLength(0);
  });
});
