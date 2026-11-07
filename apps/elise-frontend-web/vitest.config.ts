import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#/": resolve(__dirname, "src") + "/",
      "cloudflare:workers": resolve(__dirname, "src/__tests__/stubs/cloudflare-workers.ts"),
    },
  },
  test: { globals: true },
});
