import { defineRule } from "@oxlint/plugins";

/** Ban `try/catch` and `tryCatch` in route files; errors bubble to `app.onError` (CODING_STANDARDS Hono JS 5.1). */
export const noErrorHandlingInRoutesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `try/catch` and `tryCatch` in route files.",
    },
    messages: {
      tryStatement:
        "Don't catch errors in a route. Let them bubble to `app.onError`, which turns them into the envelope.",
      tryCatchCall:
        "Don't wrap a route's work in `tryCatch`. Let errors bubble to `app.onError`.",
    },
  },
  createOnce(context) {
    return {
      TryStatement(node) {
        context.report({ node, messageId: "tryStatement" });
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "tryCatch") {
          context.report({ node, messageId: "tryCatchCall" });
        }
      },
    };
  },
});
