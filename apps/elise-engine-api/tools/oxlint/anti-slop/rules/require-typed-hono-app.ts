import { defineRule } from "@oxlint/plugins";

/** Require `new Hono<AppEnv>()` so `c.env` and `c.get()` stay typed (CODING_STANDARDS Hono JS 1.4). */
export const requireTypedHonoAppRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require a type argument on `new Hono()`.",
    },
    messages: {
      untypedHono:
        "Write `new Hono<AppEnv>()`. An untyped app loses `c.env` and `c.get(...)` typing, even when this route reads no bindings.",
    },
  },
  createOnce(context) {
    return {
      NewExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "Hono") return;
        if (node.typeArguments) return;
        context.report({ node, messageId: "untypedHono" });
      },
    };
  },
});
