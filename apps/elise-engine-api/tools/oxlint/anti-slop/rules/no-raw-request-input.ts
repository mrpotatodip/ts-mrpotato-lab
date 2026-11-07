import { defineRule } from "@oxlint/plugins";

const RAW_INPUT_METHODS = new Set(["param", "query", "queries", "json"]);

/** Ban unvalidated request reads; input goes through `zValidator` (CODING_STANDARDS Hono JS 3.1). */
export const noRawRequestInputRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `c.req.param()`, `c.req.query()`, `c.req.queries()` and `c.req.json()`.",
    },
    messages: {
      rawRequestInput:
        "Don't read `{{method}}` from the request directly. Validate it with `zValidator` and read it with `c.req.valid(...)`.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.property.type !== "Identifier" || !RAW_INPUT_METHODS.has(callee.property.name)) return;
        const owner = callee.object;
        if (owner.type !== "MemberExpression" || owner.computed) return;
        if (owner.property.type !== "Identifier" || owner.property.name !== "req") return;
        context.report({
          node,
          messageId: "rawRequestInput",
          data: { method: `c.req.${callee.property.name}()` },
        });
      },
    };
  },
});
