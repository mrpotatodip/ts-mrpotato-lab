import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

type Callable = ESTree.Function | ESTree.ArrowFunctionExpression;

const EFFECT_NAME = /(?:Svc|Effect)$/u;

function isEffectType(annotation: ESTree.TSTypeAnnotation | null | undefined): boolean {
  const type = annotation?.typeAnnotation;
  if (type?.type !== "TSTypeReference") return false;
  const name = type.typeName;
  return (
    name.type === "TSQualifiedName" &&
    name.left.type === "Identifier" &&
    name.left.name === "Effect" &&
    name.right.name === "Effect"
  );
}

/** Exported `...Svc` and `...Effect` functions declare `Effect.Effect<A, E>` so a new error is a compile error here (CODING_STANDARDS Effect 2.6). */
export const requireEffectReturnTypeRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require exported functions in handlers and queries to declare an `Effect.Effect<A, E>` return type.",
    },
    messages: {
      missingEffectType:
        "Declare the return type as `Effect.Effect<A, E>`, listing each error. An exported effect is the module's contract.",
    },
  },
  createOnce(context) {
    const check = (fn: Callable, reportOn: ESTree.Node) => {
      if (isEffectType(fn.returnType)) return;
      context.report({ node: reportOn, messageId: "missingEffectType" });
    };

    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration) return;
        if (declaration.type === "FunctionDeclaration") {
          if (declaration.id && EFFECT_NAME.test(declaration.id.name)) check(declaration, declaration);
          return;
        }
        if (declaration.type !== "VariableDeclaration") return;
        for (const declarator of declaration.declarations) {
          const init = declarator.init;
          if (declarator.id.type !== "Identifier" || !EFFECT_NAME.test(declarator.id.name)) continue;
          if (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression") {
            check(init, declarator);
          }
        }
      },
    };
  },
});
