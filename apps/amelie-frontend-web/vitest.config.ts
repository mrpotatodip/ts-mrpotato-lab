import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";

// -----
// Not vite.config.ts: its Cloudflare plugin
// rejects vitest's test environment.
// -----
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  test: { environment: "jsdom" },
});
