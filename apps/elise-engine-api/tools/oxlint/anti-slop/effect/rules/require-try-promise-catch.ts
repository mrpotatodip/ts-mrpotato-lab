import { defineRule } from "@oxlint/plugins";

import { isEffectCall } from "../shared/effect-member.ts";

const TRY_PROMISE = new Set(["tryPromise"]);

/** `Effect.tryPromise` always names the failure with `catch` (CODING_STANDARDS Effect 2.2). */
export const requireTryPromiseCatchRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require a `catch` option on `Effect.tryPromise`.",
    },
    messages: {
      missingCatch:
        "Write `Effect.tryPromise({ try, catch: (cause) => new SomeTag({ cause }) })`. Without `catch`, a rejection becomes an `UnknownException` that says nothing about what failed.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isEffectCall(node, TRY_PROMISE)) return;
        const options = node.arguments[0];
        const hasCatch =
          options?.type === "ObjectExpression" &&
          options.properties.some(
            (property) =>
              property.type === "Property" &&
              property.key.type === "Identifier" &&
              property.key.name === "catch",
          );
        if (!hasCatch) context.report({ node, messageId: "missingCatch" });
      },
    };
  },
});
