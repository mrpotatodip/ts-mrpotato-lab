import { defineRule } from "@oxlint/plugins";

import type { Comment } from "@oxlint/plugins";

const DIVIDER = /^\s*-{5,}\s*$/u;
const SAFETY = /^\s*SAFETY:/u;
const DIRECTIVE =
  /^\s*(?:@ts-|eslint-|oxlint-|prettier-ignore|istanbul |c8 |v8 |biome-|@vitest-|vitest-environment)/u;

function isDirective(comment: Comment): boolean {
  return DIRECTIVE.test(comment.value);
}

function isAdjacentLine(text: string, previous: Comment, next: Comment): boolean {
  return /^[ \t]*\r?\n[ \t]*$/u.test(text.slice(previous.end, next.start));
}

function groupLineComments(text: string, comments: Comment[]): Comment[][] {
  const groups: Comment[][] = [];
  for (const comment of comments) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    if (group && previous && isAdjacentLine(text, previous, comment)) group.push(comment);
    else groups.push([comment]);
  }
  return groups;
}

function findViolation(group: Comment[]): Comment | null {
  let open = false;
  for (const comment of group) {
    if (DIVIDER.test(comment.value)) {
      open = !open;
      continue;
    }
    if (open) continue;
    if (isDirective(comment) || SAFETY.test(comment.value)) continue;
    return comment;
  }
  return open ? (group.at(-1) ?? null) : null;
}

/** Allow only SAFETY comments, wrapped `// -----` blocks and tool directives (CODING_STANDARDS General 1.2, 1.4). */
export const noUnlistedCommentsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow comments other than `// SAFETY:`, wrapped `// -----` blocks and tool directives.",
    },
    messages: {
      unlistedComment:
        "Remove this comment. Only `// SAFETY:`, a tool directive, or a block wrapped in `// -----` lines (for a reason another rule asks for) is allowed. Names, types and small functions should say what the code does.",
      blockComment:
        "Remove this block comment. Use the wrapped `// -----` form, with no `/** */` JSDoc.",
    },
  },
  createOnce(context) {
    return {
      Program() {
        const { sourceCode } = context;
        const comments = sourceCode.getAllComments().filter((comment) => comment.type !== "Shebang");

        for (const comment of comments) {
          if (comment.type === "Block" && !isDirective(comment)) {
            context.report({ node: comment, messageId: "blockComment" });
          }
        }

        const lineComments = comments.filter((comment) => comment.type === "Line");
        for (const group of groupLineComments(sourceCode.text, lineComments)) {
          const violation = findViolation(group);
          if (violation) context.report({ node: violation, messageId: "unlistedComment" });
        }
      },
    };
  },
});
