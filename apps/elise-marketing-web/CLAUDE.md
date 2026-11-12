# elise-marketing-web

Public marketing site at `eliselab.com`: Astro, static output, served from a Worker's static assets. It shares no code with the dashboard (`apps/elise-frontend-web`, `app.eliselab.com`) and talks to no API: every call to action is a link to `SITE.appUrl`.

- Copy lives in `src/constants/site.ts`; pages in `src/pages/`, one `.astro` file per route. Tokens are CSS variables in `src/styles/global.css`, kept in step with the dashboard's Daylight theme (white page, painted sky from `public/theme-bgs/`, glass cards). Copy follows the `unslop` skill and the reading-text rules in the dashboard's `DESIGN.md` (52ch lines, 32px between cards).
- In text people read the brand is **EliseLAB**; the product itself says "Elise" (as in the dashboard). Don't print a claim the product can't back: no prices, counts or customers until they exist. The example finding is labelled as an example.
- Dev runs on port 3200 (`pnpm dev` starts it with the others). `pnpm check` is `astro check` and oxlint; `astro build` writes `dist/`.
- After a visible change, confirm it with the `chrome-review` skill; `check` never renders a page.
- Deploy: `pnpm --filter elise-marketing-web run deploy` (live site: ask first). The first deploy also claims the `eliselab.com` custom domain, so the apex must be free of other DNS records.
