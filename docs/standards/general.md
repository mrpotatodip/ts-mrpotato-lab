# General

**Covers:** every source file in the monorepo, in any app or package, written by a person or an agent.

**Doesn't cover:** Markdown docs, and the text inside prompts and tool descriptions (Agents development §4).

| # | Section |
|---|---|
| 1 | [General: Comments](#1-general-comments) |
| 2 | [General: Tests](#2-general-tests) |

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

---

## 2. General: Tests

**2.1 `[House]` Lint comes first.** A test rule that a tool can check goes in the oxlint config, not in this document. This document holds only the rules that need judgment. When a review finds a test mistake that a lint rule could catch, add the rule in the same change. An agent follows a failing lint every time; it follows a sentence in a doc only sometimes.

**2.2 `[House]` These are lint errors in every `__tests__/` folder** (`oxlint.config.ts` of the engine and the dashboard): a test with no assertion (`vitest/expect-expect`), a `console` call, a skipped or focused test, two tests with the same title, an `expect` inside a condition, and a snapshot matcher. The pre-commit check fails on them. Don't disable one with a directive; fix the test.

**2.3 `[House]` Write a test only for these:** a rule of the product (limits, tenant isolation, who may do what), a query that reads or writes an Account's data, a parser or validator, and a bug that came back. Don't write a test for a type, a constant, a wrapper that only passes values through, or the behavior of a library.

**2.4 `[House]` One test per behavior.** Use `it.each` when one rule runs on many inputs. Before you add a test, check that an existing test doesn't already cover the behavior, and extend that one.

**2.5 `[House]` A new test must fail when the rule breaks.** Break the code once, watch the test fail, then restore the code. A test that passes both ways proves nothing.

**2.6 `[House]` Don't write throwaway test or print scripts to check your work.** Run `pnpm check:apps`, or write the one test you will keep.

**2.7 `[House]` Reviewers check the diff for tests.** Flag a new test that 2.3 doesn't allow, a case that duplicates another, and an assertion that only repeats the code (a non-null check, an expected value computed the way the code computes it).
