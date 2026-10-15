import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// -----
// resolve.tsconfigPaths lets the copied folders keep
// their own imports (@repo/chat-bot-api, ...): the
// paths in tsconfig.json point them at src/vendor.
// -----
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tanstackStart(), viteReact()],
});
