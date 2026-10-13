import { defineRule } from "@oxlint/plugins";

import { isEffectMember } from "../shared/effect-member.ts";

const RUN_FUNCTIONS = new Set([
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit",
  "runFork",
  "runCallback",
]);

/** Run effects through the shared runner only (CODING_STANDARDS Effect 4.1, 6.3). */
export const noEffectRunOutsideRunnerRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `Effect.run*` outside the shared runner file.",
    },
    messages: {
      rawRun:
        "Run this effect with `runEffect` from `#/lib/effect-query`. A raw `Effect.{{name}}` skips the typed-failure mapping and the defect logging.",
    },
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (!isEffectMember(node, RUN_FUNCTIONS)) return;
        const name = node.property.type === "Identifier" ? node.property.name : "run";
        context.report({ node, messageId: "rawRun", data: { name } });
      },
    };
  },
});
