import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTES = join(import.meta.dirname, "..", "routes", "_app");
const DOC = readFileSync(join(import.meta.dirname, "..", "..", "DESIGN-SCREENS.md"), "utf8");

// -----
// The word a screen goes by in DESIGN-SCREENS.md, for each top-level route
// under the app layout. A new page route that is not in this table fails the
// first test, so it cannot ship without a decision about its entry.
// -----
const SCREEN_WORD = {
  overview: "Overview",
  scans: "Scan report",
  repos: "Repositories",
  files: "Files",
  team: "Team",
  settings: "Settings",
  connections: "Connections",
  github: "GitHub",
} as const;

type Segment = keyof typeof SCREEN_WORD;

const isSegment = (value: string): value is Segment => value in SCREEN_WORD;

const topSegment = (name: string) => name.replace(/\.tsx$/, "").split(/[.$_]/)[0] ?? "";

const pageSegments = (): string[] =>
  readdirSync(ROUTES, { withFileTypes: true })
    .filter((entry) => entry.name !== "route.tsx")
    .map((entry) => topSegment(entry.name));

describe("DESIGN-SCREENS.md", () => {
  it.each([...new Set(pageSegments())])("knows the %s route", (segment) => {
    expect(isSegment(segment) ? "known" : `add "${segment}" to SCREEN_WORD, and write its entry in DESIGN-SCREENS.md`).toBe("known");
  });

  it.each(Object.entries(SCREEN_WORD))("has an entry for /%s, named %s", (_segment, word) => {
    expect(DOC).toContain(`**${word}`);
  });
});
