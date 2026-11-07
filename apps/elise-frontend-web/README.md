# elise-frontend-web

Dashboard for `elise-engine-api`: start a security scan of a public GitHub repo, watch its status, read the saved report. TanStack Start (React 19) on Cloudflare Workers, Tailwind CSS v4, shadcn/ui.

The engine has no CORS, so the browser never calls it. Server functions do, using `ELISE_ENGINE_URL` (copy `.dev.vars.example` to `.dev.vars`). Sign-in and sign-up go to the engine (`/auth/sign-in/email`, `/sign-up`, which needs an invite code); the session token it returns is kept in an httpOnly cookie. Each call sends that token plus `x-account-id`, the first account from `/me`, so a user sees only their own account's scans.

## Commands

```bash
pnpm dev       # vite dev on port 3100
pnpm cf-typegen         # regenerate worker-configuration.d.ts after editing wrangler.jsonc
pnpm build     # vite build
pnpm lint      # oxlint src
pnpm deploy    # build, then wrangler deploy
```

## Layout

- `src/routes/`: file-based routes (`/scans`, `/scans/$scanId`). `routeTree.gen.ts` is generated, do not edit it.
- `src/modules/scan/`: schemas, server functions, query options, components.
- `src/components/ui/`: shadcn primitives.
- Import alias: `#/*` maps to `src/*`.
