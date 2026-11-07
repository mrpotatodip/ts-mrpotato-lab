import type { ESTree } from "@oxlint/plugins";

type Node = ESTree.Node;

export function isEffectMember(node: Node, names: ReadonlySet<string>): node is ESTree.MemberExpression {
  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    node.object.name === "Effect" &&
    node.property.type === "Identifier" &&
    names.has(node.property.name)
  );
}

export function isEffectCall(node: Node, names: ReadonlySet<string>): node is ESTree.CallExpression {
  return node.type === "CallExpression" && isEffectMember(node.callee, names);
}

export function isFunctionNode(
  node: Node,
): node is ESTree.Function | ESTree.ArrowFunctionExpression {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}
