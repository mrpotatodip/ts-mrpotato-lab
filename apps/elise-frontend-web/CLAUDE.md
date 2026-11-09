# elise-frontend-web

Scan dashboard. Commands and layout: `README.md`. Look and tokens: `DESIGN.md`; what each screen shows: `DESIGN-SCREENS.md`. Rules: `docs/standards/react.md` and `docs/standards/worker-frontend.md`.

- The browser never calls the engine (no CORS). Server functions do, through `src/lib/engine-client.ts`. New engine calls go in `src/modules/<module>/api/`.
- Sign-in is the engine's (`/auth`, `/sign-up`). The session token lives only in the httpOnly `elise_session` cookie (`modules/auth/server/session.ts`). Every server function that reads user data starts with that session check.
- Scans run under the first account from the engine's `/me`. Take the account from the session, never from input.
- `modules/scan/schemas/finding-schemas.ts` mirrors the `findings.json` shapes in `apps/elise-engine-api/skills/*`. Change both together. Request and response shapes live in `@repo/contracts/elise`: import them.
- Verdict, Branch and History behaviour (2 scans per commit, scans of a pasted commit write no History, one Verdict per commit): `docs/adr/0003-ship-verdict.md` and `docs/adr/0004-repo-branches.md`. Read them before changing a Verdict or Branch screen.
- `pnpm check` never renders a page. After a visible change, confirm it with the `chrome-review` skill.
- `pnpm check` is `tsc`, oxlint and vitest. `vite build` does not typecheck. The oxlint `anti-slop` rules are strict (a `// SAFETY:` comment above every `as`, no `unknown` parameters).
- Dev runs on port 3100 with `--strictPort`. If it fails to start, a stale server holds the port: `pnpm dev:stop`.
