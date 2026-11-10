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
      // The shared runner itself.
      // -----
      files: ["src/lib/effect-query.ts"],
      rules: {
        "anti-slop-effect/no-effect-run-outside-runner": "off",
      },
    },
    {
      // -----
      // Runs before any route, so c.req.valid is not
      // set yet; it reads one header and compares its
      // hash (Hono JS 3.1).
      // -----
      files: ["src/lib/require-service-token.ts"],
      rules: {
        "anti-slop/no-raw-request-input": "off",
      },
    },
    {
      files: ["**/__tests__/**"],
      rules: {
        "anti-slop-effect/no-effect-catch-all": "off",
        "anti-slop-effect/no-effect-run-outside-runner": "off",
        "anti-slop-effect/no-throw-in-effect-gen": "off",
        "anti-slop-effect/require-try-promise-catch": "off",
        "anti-slop/no-parent-relative-imports": "off",
        "anti-slop/no-raw-request-input": "off",
        "anti-slop/require-typed-hono-app": "off",
        "no-console": "error",
        "vitest/expect-expect": "error",
        "vitest/no-conditional-expect": "error",
        "vitest/no-disabled-tests": "error",
        "vitest/no-focused-tests": "error",
        "vitest/no-identical-title": "error",
        "vitest/no-restricted-matchers": ["error", { toMatchSnapshot: "No snapshot tests (General 2.2).", toMatchInlineSnapshot: "No snapshot tests (General 2.2)." }],
      },
    },
  ],
});
