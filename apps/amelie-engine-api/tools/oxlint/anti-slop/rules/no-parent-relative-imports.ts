import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

type ModuleSource = ESTree.ImportDeclaration | ESTree.ExportAllDeclaration | ESTree.ExportNamedDeclaration;

/** Require the `#/` alias for anything outside the current folder (CODING_STANDARDS Hono JS 8.2). */
export const noParentRelativeImportsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `../` imports; use the `#/` alias. JSON files outside `src/` are exempt.",
    },
    messages: {
      parentRelative:
        "Import through the `#/` alias (for example `#/modules/{module}/handlers`), not `{{source}}`.",
    },
  },
  createOnce(context) {
    const check = (node: ModuleSource) => {
      const source = node.source;
      if (!source || typeof source.value !== "string") return;
      if (!source.value.startsWith("../") || source.value.endsWith(".json")) return;
      context.report({ node: source, messageId: "parentRelative", data: { source: source.value } });
    };

    return {
      ImportDeclaration: check,
      ExportAllDeclaration: check,
      ExportNamedDeclaration: check,
    };
  },
});
