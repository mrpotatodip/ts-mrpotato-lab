import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
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
