# General

**Covers:** every source file in the monorepo, in any app or package, written by a person or an agent.

**Doesn't cover:** Markdown docs, and the text inside prompts and tool descriptions (Agents development §4).

| # | Section |
|---|---|
| 1 | [General: Comments](#1-general-comments) |

---

## 1. General: Comments

**1.1 `[House]` Write no comments.** Names, types and small functions say what the code does. Don't add a comment that repeats the code, narrates a step (`// fetch the user`), labels a block, or records a change (`// added for #346`, `// removed old check`). Such comments go stale, and an agent adding them only makes a diff look explained. This rule binds agents as much as people.

**1.2 `[House]` Only these comments are allowed.** Anything not on this list is a violation:

- **`// SAFETY:`** right above an `as` assertion (React 8.1).
- **`// -----` section dividers** in `constants/` and `types/` files (Hono JS 1.7, 1.8, Contracts 2.5).
- **A comment another rule asks for:**
  - Why a response is bare, not in the envelope (Hono JS 4.1).
  - Why a route is on the public allowlist (Hono JS 6.2).
  - Why a route uses the realtime connection (Hono JS 7.2).
  - Why a read uses `POST` (Hono JS 8.1).
  - The reason for a `useMemo`, `useCallback` or `memo` that isn't obvious (React 6.4).
- **A directive a tool reads** (`// @ts-expect-error`, a lint directive), and only where no rule above forbids the suppression (React 6.3).

**1.3 `[House]` Leave other people's comments alone.** Don't delete or reword a comment you didn't write. The exception is code you're changing anyway: update or remove its comment in the same edit, so it never describes code that is gone.

**1.4 `[House]` An allowed explanatory comment uses the wrapped form.** That means the 1.2 "another rule asks for" comments: a `// -----` line, the text in short `//` lines, a closing `// -----`. No `/** */` JSDoc blocks. `// SAFETY:` stays one line.

```ts
// -----
// Public: Stripe calls this
// without a session.
// -----
```

**1.5 `[House]` Reviewers check the diff for comments.** Flag every added comment that 1.2 doesn't list, and ask for its removal.
