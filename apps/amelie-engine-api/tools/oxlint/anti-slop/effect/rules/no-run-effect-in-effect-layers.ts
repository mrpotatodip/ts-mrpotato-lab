import { defineRule } from "@oxlint/plugins";

const RUNNERS = new Set(["runEffect", "runQuery"]);

/** Ban the runner inside `handlers/` and `queries/`; only the entry point runs an effect (CODING_STANDARDS Effect 6.1). */
export const noRunEffectInEffectLayersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `runEffect` and `runQuery` in handlers and queries.",
    },
    messages: {
      runnerInLayer:
        "Don't call `{{name}}` here. Return the effect and let the route (or a Promise-library callback) run it once.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !RUNNERS.has(node.callee.name)) return;
        context.report({ node, messageId: "runnerInLayer", data: { name: node.callee.name } });
      },
    };
  },
});
