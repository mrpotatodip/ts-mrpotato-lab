import { build } from "esbuild";
import { describe, expect, it } from "vitest";

// -----
// The point of this app: bundle everything it
// imports and look at what came along. Anything
// of Amelie's, or a database driver, means the
// engine is not portable.
// -----
const FORBIDDEN = [
  "drizzle-orm",
  "node_modules/pg/",
  "db-amelie",
  "packages/contracts",
  "/amelie/",
  "better-auth",
];

describe("the engine without Amelie", () => {
  it("bundles with no Amelie code and no database driver", async () => {
    const result = await build({
      entryPoints: ["src/index.ts", "src/worker.ts"],
      bundle: true,
      write: false,
      outdir: "out",
      metafile: true,
      format: "esm",
      platform: "neutral",
      mainFields: ["module", "main"],
      conditions: ["import", "module", "default"],
      logLevel: "silent",
    });

    const inputs = Object.keys(result.metafile.inputs);
    const leaked = inputs.filter((path) => FORBIDDEN.some((bad) => path.includes(bad)));

    expect(inputs.some((path) => path.includes("chat-bot-api/src"))).toBe(true);
    expect(leaked).toEqual([]);
  });
});
