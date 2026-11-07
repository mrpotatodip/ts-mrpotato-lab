import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

import { isEffectCall, isFunctionNode } from "../shared/effect-member.ts";

const PROMISE_WRAPPERS = new Set(["tryPromise", "promise"]);

function isTransactionCallback(call: ESTree.Node, fn: ESTree.Node): boolean {
  return (
    call.type === "CallExpression" &&
    call.arguments[0] === fn &&
    call.callee.type === "MemberExpression" &&
    !call.callee.computed &&
    call.callee.property.type === "Identifier" &&
    call.callee.property.name === "transaction"
  );
}

function isWrapperCallback(fn: ESTree.Node): boolean {
  const parent = fn.parent;
  if (isTransactionCallback(parent, fn)) return true;
  if (isEffectCall(parent, PROMISE_WRAPPERS)) return parent.arguments[0] === fn;
  if (parent.type !== "Property" || parent.key.type !== "Identifier" || parent.key.name !== "try") return false;
  const object = parent.parent;
  return object.type === "ObjectExpression" && isEffectCall(object.parent, PROMISE_WRAPPERS);
}

function takesTransaction(fn: ESTree.Function | ESTree.ArrowFunctionExpression): boolean {
  const first = fn.params[0];
  return first?.type === "Identifier" && first.name === "tx";
}

function isInsideWrapperCallback(node: ESTree.Node): boolean {
  let current: ESTree.Node | null = node;
  while (current) {
    if (isFunctionNode(current) && isWrapperCallback(current)) return true;
    current = current.parent ?? null;
  }
  return false;
}

/** Keep `async` out of Effect layers except inside `Effect.tryPromise`, a database transaction or a helper that takes `tx` (CODING_STANDARDS Effect 6.1). */
export const noAsyncInEffectLayersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow async functions in handlers and queries, except as the callback of Effect.tryPromise, Effect.promise, a database transaction, or a helper whose first parameter is `tx`.",
    },
    messages: {
      asyncInLayer:
        "Handlers and queries are Effect only. Wrap Promise work in `Effect.tryPromise({ try, catch })` and return the effect.",
    },
  },
  createOnce(context) {
    const check = (node: ESTree.Function | ESTree.ArrowFunctionExpression) => {
      if (!node.async || takesTransaction(node) || isInsideWrapperCallback(node)) return;
      context.report({ node, messageId: "asyncInLayer" });
    };

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});
