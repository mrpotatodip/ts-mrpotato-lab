import { defineConfig } from "oxlint";

export default defineConfig({
  ignorePatterns: ["tools/oxlint/anti-slop/**"],
  plugins: ["typescript", "unicorn", "oxc", "vitest", "promise"],
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  jsPlugins: [
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
    { name: "anti-slop-effect", specifier: "./tools/oxlint/anti-slop/effect/index.ts" },
  ],
  rules: {
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-http-exception-throw": "error",
    "anti-slop/no-parent-relative-imports": "error",
    "anti-slop/no-raw-request-input": "error",
    "anti-slop/no-unlisted-comments": "error",
    "anti-slop-effect/no-async-in-effect-layers": "off",
    "anti-slop-effect/no-effect-catch-all": "error",
    "anti-slop-effect/no-effect-run-outside-runner": "error",
    "anti-slop-effect/no-run-effect-in-effect-layers": "off",
    "anti-slop-effect/no-throw-in-effect-gen": "error",
    "anti-slop-effect/require-effect-return-type": "off",
    "anti-slop-effect/require-try-promise-catch": "error",
    "anti-slop/require-typed-hono-app": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    // -----
    // Effect's tagged errors discriminate on
    // its own `_tag` field.
    // -----
    "no-underscore-dangle": ["error", { allow: ["_tag"] }],
  },
  overrides: [
    {
      files: ["src/modules/**/api/**"],
      rules: {
        "anti-slop/no-error-handling-in-routes": "error",
      },
    },
    {
      files: ["src/modules/**/handlers/**", "src/modules/**/queries/**"],
      rules: {
        "anti-slop-effect/no-async-in-effect-layers": "error",
        "anti-slop-effect/no-run-effect-in-effect-layers": "error",
        "anti-slop-effect/require-effect-return-type": "error",
      },
    },
    {
      // -----
      // Runs before any route, so c.req.valid isn't
      // set yet; it parses the query with a Zod
      // schema itself (Hono JS 3.1).
      // -----
      files: ["src/modules/tenant/lib/require-tenant-member.ts"],
      rules: {
        "anti-slop/no-raw-request-input": "off",
      },
    },
    {
      // -----
      // Promise-library callbacks: the stream producer
      // runs effects after the request has returned
      // (Effect 6.3).
      // -----
      files: ["src/modules/chat-bot/handlers/stream-chat-bot-svc.ts"],
      rules: {
        "anti-slop-effect/no-async-in-effect-layers": "off",
        "anti-slop-effect/no-run-effect-in-effect-layers": "off",
      },
    },
    {
      // -----
      // The shared runner itself, and the two chat-bot
      // tool runners that need the raw Exit to answer
      // the model with { error } (Agents 3.4).
      // -----
      files: [
        "src/lib/effect-query.ts",
        "src/modules/chat-bot/lib/chat-bot-server-tool.ts",
        "src/modules/chat-bot/lib/chat-bot-mcp-tool.ts",
      ],
      rules: {
        "anti-slop-effect/no-effect-run-outside-runner": "off",
      },
    },
    {
      files: ["**/__tests__/**"],
      rules: {
        "anti-slop-effect/no-async-in-effect-layers": "off",
        "anti-slop-effect/no-effect-catch-all": "off",
        "anti-slop-effect/no-effect-run-outside-runner": "off",
        "anti-slop-effect/no-run-effect-in-effect-layers": "off",
        "anti-slop-effect/no-throw-in-effect-gen": "off",
        "anti-slop-effect/require-effect-return-type": "off",
        "anti-slop-effect/require-try-promise-catch": "off",
        "anti-slop/no-parent-relative-imports": "off",
        "anti-slop/no-raw-request-input": "off",
        "anti-slop/require-typed-hono-app": "off",
      },
    },
  ],
});
