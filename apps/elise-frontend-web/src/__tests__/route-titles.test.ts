import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTES = join(import.meta.dirname, "..", "routes");
const PAGE = /component:/;
const TITLE = /head:[\s\S]*?title:/;

const routeFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name.endsWith(".tsx") && entry.name !== "route.tsx" ? [path] : [];
  });

describe("route titles", () => {
  const pages = routeFiles(ROUTES).filter((file) => PAGE.test(readFileSync(file, "utf8")));

  it("finds the page routes", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages)("%s sets a document title", (file) => {
    expect(readFileSync(file, "utf8")).toMatch(TITLE);
  });
});
