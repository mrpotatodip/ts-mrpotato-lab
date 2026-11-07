# elise-frontend-web: Design

Written from the code on 2026-11-08. The code is the source of truth. **Verified** means a file defines it. **Leftover** means copied from the old Amelie app and unused here. **Unknown** means the code does not say.

## Stack

Tailwind CSS v4 (CSS-first, no `tailwind.config`), shadcn/ui on Base UI (`@base-ui/react`, no Radix), `class-variance-authority`, `cn()` in `src/lib/utils.ts`, `lucide-react` icons, `sonner` toasts. **Verified**: `package.json`, `components.json`.

## Tokens

- **Verified** All colors, radius and shadows are CSS variables in `src/styles/globals.css` (`:root`), mapped to Tailwind in `@theme inline`. Use the semantic classes (`bg-background`, `text-muted-foreground`, `bg-primary`, `border-input`, `text-destructive`). Don't write raw palette classes (`bg-red-600`).
- **Verified** Light theme, warm neutral base (hue 55-75), a terracotta `--primary` (`oklch(0.58 0.09 30)`), `--radius: 0.75rem`.
- **Verified** System font stacks only (`--font-sans`, `--font-mono`). No web fonts loaded. Code and file paths use `font-mono`.
- **Unknown** Dark theme: `.dark` tokens exist, but nothing in the app sets the `.dark` class, so dark mode is unreachable.

## Components (`src/components/ui/`)

`badge`, `button`, `card`, `empty`, `input`, `label`, `select`, `skeleton`, `sonner`, `table`, `textarea`. **Verified** by listing the folder. Add a primitive only when a screen needs it (`pnpm dlx shadcn add`, registry in `components.json`).

- **Button** variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default`, `sm`, `lg`, `icon`, `icon-sm`. The primary button is wide: `px-8` by default.
- **Badge** variants: `default`, `secondary`, `destructive`, `outline`.
- Selects in forms are currently native `<select>` (`ScanSelect` in `scan-new-form.tsx`), not the `select` primitive. **Unknown** whether that is intended.

## Patterns in use

- **Page**: `mx-auto w-full max-w-5xl p-6`, sections separated by `gap-6` or `gap-8`. Header: `border-b`, same `max-w-5xl` (`routes/_app/route.tsx`).
- **Headings**: page title `text-xl font-semibold`, section title `text-lg font-semibold`. Secondary text: `text-sm text-muted-foreground`.
- **Cards** hold forms and stat blocks; tables hold lists of scans and findings.
- **Status**: `ScanStatusBadge` maps scan state to a Badge variant. `ScanSeverityBadge` maps severity the same way. Both are in `modules/scan/components/`.
- **Loading**: `Skeleton` inside `Suspense`. **Empty**: the `Empty` primitive. **Errors**: `toast.error` from `sonner`.

## Known drift

- Severity bars in `scan-overview.tsx` use the `--status-*` tokens. Dark values exist only for `success` and `danger`, so `warning`, `info` and `neutral` have none.
- `globals.css` (209 lines) was pruned of Amelie leftovers: chat and bot animations, first-run screens, `squircle`, `dashboard-*`, `stat-*`, `status-badge`, `--sidebar-*` and `--chart-*`.
