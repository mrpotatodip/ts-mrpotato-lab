import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

import { isEffectCall, isFunctionNode } from "../shared/effect-member.ts";

const GEN = new Set(["gen"]);

function enclosingFunction(node: ESTree.Node): ESTree.Node | null {
  let current: ESTree.Node | null = node.parent ?? null;
  while (current && !isFunctionNode(current)) current = current.parent ?? null;
  return current;
}

/** A `throw` inside `Effect.gen` becomes a defect no `catchTag` can see (CODING_STANDARDS Effect 2.3). */
export const noThrowInEffectGenRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `throw` directly inside an `Effect.gen` generator.",
    },
    messages: {
      throwInGen:
        "Don't `throw` in `Effect.gen`. Fail with `return yield* new SomeTag(...)`, or wrap throwing code in `Effect.try`.",
    },
  },
  createOnce(context) {
    return {
      ThrowStatement(node) {
        const fn = enclosingFunction(node);
        if (!fn || fn.type !== "FunctionExpression" || !fn.generator) return;
        if (!isEffectCall(fn.parent, GEN)) return;
        context.report({ node, messageId: "throwInGen" });
      },
    };
  },
});
