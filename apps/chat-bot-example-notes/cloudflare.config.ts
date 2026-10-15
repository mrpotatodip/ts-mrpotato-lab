import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/worker.ts" with { type: "cf-worker" };

// -----
// OPENAI_API_KEY and NOTES_MODEL are not declared
// here: locally they come from .dev.vars, and on
// deploy they are a secret and a var.
// -----
export default defineConfig({
  worker: {
    name: "chat-bot-example-notes",
    compatibilityDate: "2025-06-01",
    compatibilityFlags: ["nodejs_compat_v2"],
    entrypoint,
    observability: { enabled: true },
    env: {
      ENVIRONMENT: bindings.text("production"),
    },
  },
});
