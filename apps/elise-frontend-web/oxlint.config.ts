import { defineConfig, type OxlintOverride } from "oxlint";

// -----
// Modules import in one direction only: shell and usage at the bottom, then scan,
// then finding, then repo. A lower module that imports a higher one makes a cycle,
// so the file that needs both (a route) composes them and passes the parts down.
// -----
const forbidModules = (files: string, modules: readonly string[], message: string): OxlintOverride => ({
  files: [files],
  rules: {
    "no-restricted-imports": ["error", { patterns: [{ group: modules.flatMap((name) => [`#/modules/${name}`, `#/modules/${name}/*`]), message }] }],
  },
});

export default defineConfig({
  ignorePatterns: ["tools/oxlint/anti-slop/**", "src/routeTree.gen.ts", "worker-configuration.d.ts"],
  plugins: ["typescript", "unicorn", "oxc", "react", "jsx-a11y", "react-perf", "vitest"],
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  jsPlugins: [
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
  ],
  overrides: [
    forbidModules("src/modules/shell/**", ["scan", "repo", "finding", "team", "usage"], "The shell is the frame every screen sits in, so it cannot import a screen's module. Take what it needs as props."),
    forbidModules("src/modules/scan/**", ["repo", "finding", "team"], "The scan module sits below repo and finding. Take their parts as props or slots from the route that composes them."),
    forbidModules("src/modules/usage/**", ["scan", "repo", "finding", "team"], "The usage module sits below the screens that show it."),
    forbidModules("src/modules/finding/**", ["repo"], "The finding module sits below repo."),
    {
      files: ["**/__tests__/**"],
      rules: {
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
  rules: {
    "react/react-in-jsx-scope": "off",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-deprecated-query-client-calls": "error",
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
    "anti-slop/no-unlisted-comments": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
  },
});
