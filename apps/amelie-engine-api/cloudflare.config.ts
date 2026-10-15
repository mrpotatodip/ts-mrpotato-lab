import { bindings, defineConfig, triggers } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "amelie-engine-api",
    compatibilityDate: "2025-06-01",
    compatibilityFlags: ["nodejs_compat_v2"],
    entrypoint,
    observability: {
      enabled: true,
    },
    env: {
      // -----
      // Auth origins are set per environment in
      // .dev.vars (local) and as secrets/vars on
      // deploy once Amelie has its own domains.
      // -----
      ENVIRONMENT: bindings.text("production"),
      // -----
      // Amelie's own Neon database (@repo/db-amelie).
      // HYPERDRIVE caches eligible reads; HYPERDRIVE_REALTIME is the
      // same origin with caching disabled (auth, writes, and any
      // read that must be fresh). Recreate with:
      //   wrangler hyperdrive create amelie --connection-string=<neon url>
      //   wrangler hyperdrive create amelie-realtime --connection-string=<neon url> --caching-disabled
      // Locally, the dev server reads the connection
      // string from CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_<BINDING> (see README).
      // -----
      HYPERDRIVE: bindings.hyperdrive({
        id: "802e2b007b254a468dfe586f90c5a65d",
      }),
      HYPERDRIVE_REALTIME: bindings.hyperdrive({
        id: "cf096098cd444c3e9bc7c424f3c87b4c",
      }),
      // -----
      // Public chat (#342): messages per Customer
      // and new threads per IP, 10 a minute each.
      // -----
      PUBLIC_CHAT_MESSAGE_LIMITER: bindings.rateLimit({
        namespace: "3421",
        simple: { limit: 10, period: 60 },
      }),
      PUBLIC_CHAT_NEW_THREAD_LIMITER: bindings.rateLimit({
        namespace: "3422",
        simple: { limit: 10, period: 60 },
      }),
      // -----
      // Sign-in attempts per IP. better-auth's own
      // limiter keeps counts in memory, which a
      // Worker loses between isolates.
      // -----
      AUTH_SIGN_IN_LIMITER: bindings.rateLimit({
        namespace: "3423",
        simple: { limit: 5, period: 60 },
      }),
      // -----
      // Sign-up attempts per IP (#354). The one place
      // the limit is set: 5 a minute. Over it, the
      // caller gets the wrong-invite-code answer.
      // -----
      SIGN_UP_LIMITER: bindings.rateLimit({
        namespace: "3541",
        simple: { limit: 5, period: 60 },
      }),
      // -----
      // Menu imports and menu item photos. Local cf
      // dev writes to the real bucket so objects show
      // in the Cloudflare R2 dashboard.
      // -----
      IMPORT_FILES: bindings.r2({
        name: "ts-elise-lab",
        dev: { remote: true },
      }),
      IMPORT_QUEUE: bindings.queue({ name: "amelie-imports" }),
    },
    triggers: [triggers.queue({ name: "amelie-imports", maxRetries: 2 })],
  },
});
