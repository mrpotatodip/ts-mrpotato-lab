import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  define: { MIGRATIONS_DIR: JSON.stringify(resolve(__dirname, "../../packages/db-elise/migrations")) },
  resolve: {
    alias: {
      "#/": resolve(__dirname, "src") + "/",
      "cloudflare:workers": resolve(__dirname, "src/__tests__/stubs/cloudflare-workers.ts"),
      "@cloudflare/sandbox": resolve(__dirname, "src/__tests__/stubs/cloudflare-sandbox.ts"),
    },
  },
  test: {
    globals: true,
    testTimeout: 30_000,
  },
});
