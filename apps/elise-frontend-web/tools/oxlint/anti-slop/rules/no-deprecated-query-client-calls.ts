import { defineRule } from "@oxlint/plugins";

const REPLACEMENT = new Map([
  ["ensureQueryData", "queryClient.query({ ...options, staleTime: 'static' })"],
  ["ensureInfiniteQueryData", "queryClient.infiniteQuery({ ...options, staleTime: 'static' })"],
  ["prefetchQuery", "void queryClient.query(options).catch(noop)"],
  ["prefetchInfiniteQuery", "void queryClient.infiniteQuery(options).catch(noop)"],
]);

/** Ban the QueryClient methods TanStack Query has deprecated in favour of query and infiniteQuery. */
export const noDeprecatedQueryClientCallsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow QueryClient.ensureQueryData and prefetchQuery; TanStack Query replaced them with query and infiniteQuery.",
    },
    messages: {
      deprecated: "`{{name}}` is deprecated and will be removed in the next major version. Use `{{replacement}}`.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return;
        const name = callee.property.name;
        const replacement = REPLACEMENT.get(name);
        if (replacement === undefined) return;
        context.report({ node: callee.property, messageId: "deprecated", data: { name, replacement } });
      },
    };
  },
});
