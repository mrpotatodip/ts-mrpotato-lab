import { defineRule } from "@oxlint/plugins";

import { isEffectMember } from "../shared/effect-member.ts";

const CATCH_ALL = new Set(["catchAll"]);

/** Handle errors by tag; `catchAll` swallows a tag added later (CODING_STANDARDS Effect 3.5). */
export const noEffectCatchAllRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `Effect.catchAll`; use `catchTag` or `catchTags`.",
    },
    messages: {
      catchAll:
        "Use `Effect.catchTag` or `Effect.catchTags`. `catchAll` sends every tag down one path, so an error added later is swallowed without a compile error.",
    },
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (isEffectMember(node, CATCH_ALL)) context.report({ node, messageId: "catchAll" });
      },
    };
  },
});
