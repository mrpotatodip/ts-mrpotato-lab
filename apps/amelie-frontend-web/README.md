# amelie-frontend-web

The cafe owner's dashboard and the public customer chat for Amelie. TanStack Start (React 19) on Cloudflare Workers, Tailwind CSS v4, shadcn/ui.

## Commands

```bash
pnpm dev       # vite dev on port 3000
pnpm build     # vite build
pnpm test      # vitest run
pnpm lint      # oxlint src
pnpm deploy    # build, then wrangler deploy
```

## Layout

- `src/routes/`: file-based routes. `routeTree.gen.ts` is generated, do not edit it.
- `src/modules/`: one folder per feature (`dashboard`, `menu`, `faq`, `chat-bot`, ...).
- `src/components/ui/`: shadcn primitives.
- `src/styles/`: `globals.css` (tokens) and `dashboard.css` (dashboard theme).
- Import alias: `#/*` maps to `src/*`.

See [DESIGN.md](./DESIGN.md) for the design system and [ui-registry.md](./ui-registry.md) for recorded UI patterns.
