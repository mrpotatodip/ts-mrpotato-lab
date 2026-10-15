import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "amelie-engine-api-2-0",
    compatibilityDate: "2025-06-01",
    compatibilityFlags: ["nodejs_compat_v2"],
    entrypoint,
    observability: { enabled: true },
    env: {
      ENVIRONMENT: bindings.text("production"),
    },
  },
});
