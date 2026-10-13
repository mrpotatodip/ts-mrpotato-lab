import { defineRule } from "@oxlint/plugins";

/** Ban `new HTTPException`; module code throws `AppError` subclasses (CODING_STANDARDS Hono JS 5.2). */
export const noHttpExceptionThrowRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow creating `HTTPException`; throw an `AppError` subclass instead.",
    },
    messages: {
      httpException:
        "Throw an `AppError` subclass (`NotFoundError`, `ValidationError`, ...), not `HTTPException`. `onError` maps `HTTPException` to the generic code `HTTP_ERROR`.",
    },
  },
  createOnce(context) {
    return {
      NewExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "HTTPException") {
          context.report({ node, messageId: "httpException" });
        }
      },
    };
  },
});
