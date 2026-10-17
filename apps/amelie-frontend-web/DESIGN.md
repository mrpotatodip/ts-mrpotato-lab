# Amelie Frontend Web: Design System

Extracted from the existing implementation on 2026-10-11. The code is the source of truth. Nothing here is a proposal.

**Status labels used below**

- **Verified token**: defined in CSS or a component file, with the path given.
- **Recurring style**: repeated in components with no token or shared component behind it. Counts come from a grep of `src/modules`, `src/routes` and `src/components` on this date.
- **Unknown**: could not be determined from the code.

**Stack**: Tailwind CSS v4 (CSS-first, no `tailwind.config`), shadcn/ui (`components.json`: style `default`, base color `neutral`, CSS variables on, icons `lucide`), `class-variance-authority`, `tailwind-merge` via `cn()` in `src/lib/utils.ts`, Base UI primitives (`@base-ui/react`; no Radix), `sonner` for toasts, `lucide-react` icons, `recharts` for charts.

---

## 1. One theme

All tokens live in `src/styles/globals.css` (`:root` for light, `.dark` for dark). There is no second theme file: the former `dashboard.css` and its `.amelie-dashboard` scope were merged in, so sign-in, chat and the dashboard share one look (warm espresso accent, `--radius: 0.75rem`).

The dashboard utilities (`.dashboard-content`, `.dashboard-grid`, `.dashboard-card`, `.stat-*`, `.status-badge`) are at the bottom of `globals.css`.

**Dark mode**

- Tailwind variant: `@custom-variant dark (&:is(.dark *))` in `globals.css`.
- A `.dark` class on `<html>`, set before paint by `THEME_INIT_SCRIPT` in `src/routes/__root.tsx`, and at runtime by `src/modules/shared/hooks/use-theme.ts`.
- Modes: `light` (default), `dark`, `auto` (follows the OS). Stored in `localStorage["theme"]`.
- Toggle UI: `dashboard-theme-toggle.tsx`.
- The two copies of the apply logic are kept in step by hand, per comments in both files.
- `theme-color` meta values: `#fbfaf9` (light) and `#110f0e` (dark), converted from `--background`.

---

## 2. Color

### 2.1 Core tokens (verified)

All are OKLCH. Each is exposed to Tailwind as `--color-*` through `@theme inline` in `globals.css`, so `bg-card`, `text-muted-foreground`, `border-border` and so on work.

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(0.985 0.002 75)` | `oklch(0.17 0.004 60)` |
| `--foreground` | `oklch(0.22 0.01 60)` | `oklch(0.95 0.005 75)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.21 0.005 60)` |
| `--popover` | `oklch(1 0 0)` | `oklch(0.21 0.005 60)` |
| `--primary` | `oklch(0.38 0.05 50)` | `oklch(0.78 0.08 65)` |
| `--primary-foreground` | `oklch(0.985 0.002 75)` | `oklch(0.2 0.01 60)` |
| `--secondary` | `oklch(0.955 0.006 75)` | `oklch(0.27 0.006 60)` |
| `--muted` | `oklch(0.955 0.006 75)` | `oklch(0.27 0.006 60)` |
| `--muted-foreground` | `oklch(0.54 0.012 60)` | `oklch(0.7 0.01 70)` |
| `--accent` | `oklch(0.945 0.012 75)` | `oklch(0.29 0.008 60)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.66 0.19 25.5)` |
| `--destructive-foreground` | `oklch(1 0 0)` | `oklch(0.16 0 0)` |
| `--border` / `--input` | `oklch(0.915 0.006 75)` | `oklch(0.29 0.006 60)` |
| `--ring` | `oklch(0.62 0.06 50)` | `oklch(0.6 0.06 60)` |

Also defined: `--secondary-foreground`, `--accent-foreground`, `--card-foreground`, `--popover-foreground`, and the full `--sidebar-*` set (`sidebar`, `-foreground`, `-primary`, `-primary-foreground`, `-accent`, `-accent-foreground`, `-border`, `-ring`).

**Base layer** (`globals.css`): `* { border-color: var(--border); outline: ring/50 }`, `body { bg-background text-foreground }`.

### 2.2 Status colors (verified)

 Ink and soft-fill pairs, with light and dark values. They are exposed as `bg-status-*` and `text-status-*`.

| Tone | Ink (light / dark) | Soft fill (light / dark) |
|---|---|---|
| success | `oklch(0.52 0.12 155)` / `oklch(0.78 0.13 155)` | `oklch(0.95 0.04 155)` / `oklch(0.3 0.05 155)` |
| warning | `oklch(0.58 0.12 75)` / `oklch(0.83 0.13 85)` | `oklch(0.96 0.05 90)` / `oklch(0.31 0.05 85)` |
| info | `oklch(0.52 0.12 245)` / `oklch(0.76 0.11 245)` | `oklch(0.95 0.03 245)` / `oklch(0.3 0.045 245)` |
| danger | `oklch(0.55 0.17 27)` / `oklch(0.72 0.16 27)` | `oklch(0.95 0.03 20)` / `oklch(0.3 0.055 27)` |
| neutral | `oklch(0.5 0.01 60)` / `oklch(0.75 0.01 70)` | `oklch(0.95 0.005 75)` / `oklch(0.28 0.005 60)` |

Defined in `globals.css` with `--color-status-*` mappings. Consumers: the `.status-badge` utility (6.5), the sign-in banners (`auth-signin.tsx`) and `AppErrorComponent`.

### 2.3 Chart colors (verified)

`--chart-1` to `--chart-5`, defined for light and dark. Five mixed hues (brown 50, amber 70, green 150, blue 240, tan 60). The only consumer found is `src/components/ui/chart.tsx` plus one more file (2 files match `chart-`).

### 2.4 Removed unused tokens

The `--severity-*`, `--heat-*`, `--tile-*`, `--delta-*` and `--unread` variables (and their `--color-*` mappings) came from Elise. They had no references in Amelie and were removed from `globals.css`.

### 2.5 Recurring raw colors (not tokenized)

| Where | Classes | Purpose |
|---|---|---|
| `routes/__root.tsx`, `use-theme.ts` | `#ffffff`, `#0d0d0d` | `theme-color` meta. Comment says "matches each theme's --background token", but see 11.4 |

The sign-in banners and `AppErrorComponent` now use `status-success` / `status-danger` tokens. Elsewhere, errors use `text-destructive` (see 8).

---

## 3. Typography

### 3.1 Font families

- **Body**: `font-sans` on `<body>` (`__root.tsx`), with `antialiased [overflow-wrap:anywhere]`. `--font-sans` is the system stack (`ui-sans-serif, system-ui, -apple-system, ...`) in `globals.css`.
- **Mono**: `--font-mono` (`ui-monospace, SFMono-Regular, Menlo, ...`). Used for the invite code (`admin-invite-code-dialog.tsx:65`, `text-lg tracking-wider`) and chart tooltip values.
- **Serif**: `--font-serif` is defined. No usage found.
- **Web fonts**: none. The app loads no Google Fonts and has no font constants. The whole UI renders in the system font stack.

### 3.2 Scale (recurring style)

Counts of Tailwind text utilities across `modules/`, `routes/`, `components/`:

| Class | Count | Typical use |
|---|---|---|
| `text-sm` | 139 | Default UI text, body copy, form text, list rows |
| `text-xs` | 64 | Inline field errors, helper text, sidebar user name |
| `text-lg` | 9 | `PageCard` title, `DialogTitle`, `EmptyTitle` |
| `text-base` | 5 | Page description, sidebar brand |
| `text-3xl` | 3 | Dashboard page `h1` |
| `text-xl`, `text-2xl`, `text-5xl` | 1 each | Sign-in tagline, `CardTitle` default, "Amelie" wordmark on the first-run screen |

Weights: `font-medium` 48, `font-semibold` 16, `font-normal` 12, `font-bold` 3, `font-light` 1.

Custom dashboard sizes (verified, `globals.css`):

| Utility | Size / line height | Weight | Extra |
|---|---|---|---|
| `.stat-label` | 0.8125rem / 1.25rem | normal | `color: var(--muted-foreground)` |
| `.stat-value` | 1.75rem / 2rem | 600 | `letter-spacing: -0.02em`, tabular numerals |
| `.status-badge` | 0.75rem / 1.25rem | 500 | |

### 3.3 Heading hierarchy (recurring style)

No shared `Heading` component. The pattern in use:

| Level | Classes | Source |
|---|---|---|
| Page title (`h1`) | `text-3xl font-semibold tracking-tight` | `dashboard-page-header.tsx` |
| Page description | `text-muted-foreground text-base` | same |
| Section card title | `text-lg` on `CardTitle` (which supplies `font-semibold leading-none tracking-tight`) | `shared/components/page-card.tsx` |
| Top bar label | `text-sm font-medium` | `dashboard-header.tsx` |
| Row title | `text-sm font-medium` | `menu-item-row.tsx`, `dashboard-attention.tsx` |
| Row secondary | `text-muted-foreground text-sm` or `.stat-label` | various |

Line heights: Tailwind defaults, plus `leading-none` (card and dialog titles), `leading-relaxed` (menu item description), `text-sm/relaxed` (`EmptyDescription`).

---

## 4. Spacing

`--spacing: 0.25rem` (Tailwind default step). Tokens `--dashboard-gap: 1rem` and `--dashboard-content-max: 80rem` (verified).

**Most common utilities in `modules/` and `routes/`** (recurring style):

| Utility | Count | Meaning in practice |
|---|---|---|
| `gap-2` | 32 | Inline groups (button rows, icon plus label) |
| `gap-3` | 28 | Form field stacks, list item internals |
| `gap-1.5` | 20 | Tight chip and badge rows |
| `p-6` | 18 | Card body and `PageCard` content padding |
| `gap-4` | 16 | Medium groupings |
| `px-6` | 11 | Row padding inside cards (`px-6 py-5`) |
| `gap-8`, `space-y-8` | 11, 10 | Gap between page sections |
| `p-4`, `px-4` | 9, 9 | Header, sidebar header and footer, small panels |

Layout rhythm (verified in `globals.css`):

- Page content padding: `1rem`, then `1.5rem` from 768px.
- Gap between top-level blocks in `.dashboard-content`: `calc(var(--dashboard-gap) * 1.5)` = 1.5rem.
- Stat grid gap: `var(--dashboard-gap)` = 1rem.

---

## 5. Shape: radius, borders, shadow

### 5.1 Radius

`--radius` is **0.75rem** (`:root`, not overridden in dark). Derived scale in `@theme inline`:

| Class | Value | Size |
|---|---|---|
| `rounded-sm` | `radius - 4px` | 8px |
| `rounded-md` | `radius - 2px` | 10px |
| `rounded-lg` | `radius` | 12px |
| `rounded-xl` | `radius + 4px` | 16px |

Tailwind's own `rounded-2xl` (16px) and `rounded-3xl` (24px) are fixed and do not follow `--radius`. `rounded-2xl` is used on list boxes and matches `rounded-xl` today.

Usage counts: `rounded-md` 31, `rounded-full` 12, `rounded-2xl` 11, `rounded-sm` 10, `rounded-lg` 8, `rounded-xl` 3, `rounded-none` 3, `rounded-3xl` (cards and drawer).

Per component (verified): buttons, inputs, selects, tabs list, tooltips use `rounded-md`. `Card` uses `rounded-3xl`. Badges use `rounded-full`. Checkbox uses `rounded-sm`. `PageCard` and `DashboardStatCard` use `rounded-3xl` (24px, fixed) (16px in the dashboard), following `--radius`.

`.squircle` utility (superellipse mask, `globals.css`) is defined with 0 usages in the current tree.

### 5.2 Borders

- Width: 1px everywhere (`border`). Color is `--border` through the base layer, so a bare `border` works.
- Inputs: `border-input` (same value as `--border`).
- Separators: `Separator` (`ui/separator.tsx`), `divide-y` on `<ul>` rows, `border-b` on table rows and the sticky header, `border-t` on `PageCard` content.
- Dashed border: only in `Empty` (`border-dashed`), which has 0 usages.

### 5.3 Shadow

Defined set in `globals.css` (`--shadow-2xs` to `--shadow-2xl`), all very light (`hsl(0 0% 0% / 0.05 to 0.25)`). In use:

- `Card`: `shadow-sm`. `PageCard` overrides with `shadow-none`.
- Dialogs and sheets: `shadow-lg`. Select, tooltip: `shadow-md`.
- Dashboard cards: `box-shadow: var(--shadow-card)` = `0 1px 2px 0 oklch(0.2 0.01 60 / 0.04)` in light, `none` in dark.
- Sign-in, sign-up and sign-out cards: `shadow-floating` (token `--shadow-floating: 0 8px 40px 12px oklch(0 0 0 / 0.06)`, in `globals.css`) with `border-0`.

---

## 6. Components

All primitives are in `src/components/ui/`. Domain components compose them.

### 6.1 Button (`ui/button.tsx`, cva, Base UI `Button`)

Base: `inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors`, `[&_svg]:size-4`.

| Variant | Classes |
|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90`. Extra x-padding vs other variants: `px-8` (default), `px-6` (sm), `px-12` (lg) |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `outline` | `border border-input bg-transparent hover:bg-accent hover:text-accent-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

| Size | Classes |
|---|---|
| `default` | `h-10 px-4 py-2` |
| `sm` | `h-9 px-3` |
| `lg` | `h-11 px-8` |
| `icon` | `h-10 w-10` |
| `icon-sm` | `h-9 w-9 shrink-0` |

Forms in the app mostly use `size="sm"` (for example `faq-form.tsx`). Primary action is `default`, cancel is `variant="ghost"`, destructive confirm is `variant="destructive"` (`admin-invite-code-revoke-button.tsx`).

### 6.2 Inputs

- **Input** (`ui/input.tsx`): `h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm`, placeholder `text-muted-foreground`.
- **Textarea** (`ui/textarea.tsx`): same chrome, `min-h-[80px]`.
- **Select** (`ui/select.tsx`, Base UI): trigger `h-10 ... text-sm` with a `ChevronDown` at 50% opacity. Popup `rounded-md border bg-popover shadow-md`, items `py-1.5 pl-8 pr-2 text-sm`, highlighted `bg-accent`, check indicator at the left. Common override in forms: `className="w-fit min-w-40"`.
- **Checkbox** (`ui/checkbox.tsx`, Base UI): `h-4 w-4 rounded-sm border-primary`, checked `bg-primary`. With the `indeterminate` prop it fills the same and shows a minus instead of the tick (the group box in the role power checklist). Paired with its text as `<label class="flex items-center gap-2">`.
- **Label** (`ui/label.tsx`, a native `<label>`): `text-sm font-medium leading-none`. The component is used for checkboxes and menu form fields. Forms differ: the FAQ, menu and schedule forms use `aria-label` plus placeholder; the business-profile form and location rows use visible `<label>` elements (`flex flex-col gap-1.5 text-sm`); sign-in, sign-up and the admin invite form use their own label classes (see 11.16).
- `InputGroup`, `Kbd`: present, 0 usages of `InputGroup` in modules.

### 6.3 Cards

- **Card** (`ui/card.tsx`): `rounded-3xl border bg-card text-card-foreground shadow-sm`. Header `p-6` with `space-y-1.5`, content `p-6 pt-0`, footer `flex items-center p-6 pt-0`. Title default `text-2xl font-semibold leading-none tracking-tight`.
- **PageCard** (`modules/shared/components/page-card.tsx`): the main section container, 19 uses. A `Card` (already `rounded-3xl`) with `bg-muted/60 shadow-none`. The header sits on the muted tint, the body is `rounded-3xl border-t bg-card pt-6`. Title `text-lg`, optional description and right-aligned `action`.
- **Dashboard card** (`.dashboard-card` utility in `globals.css`): flat, `1px` border, `var(--radius)`, `bg-card`, `var(--shadow-card)`. Only `DashboardStatCard` uses it, and it overrides the radius with `rounded-3xl`.
- **Stat card** (`dashboard-stat-card.tsx`): a `Link` with `.dashboard-card`, `p-6`, `gap-3`, `hover:bg-accent/40`. Contains `.stat-label`, `.stat-icon` (2.25rem square, `bg-accent`, `text-primary`), `.stat-value`. The loading copy is in `dashboard-overview-skeleton.tsx` (see 6.11).
- **List-in-card rows**: `<ul class="divide-y">` with `px-6 py-5` rows and `hover:bg-accent/40 transition-colors` (`dashboard-attention.tsx`, `dashboard-setup-checklist.tsx`).

### 6.4 Dialog, Sheet, Drawer, Dropdown, Tooltip

| Component | Primitive | Key classes |
|---|---|---|
| Dialog (`ui/dialog.tsx`) | Base UI | Overlay `bg-black/20 backdrop-blur-lg`, content `max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg`, title `text-lg font-semibold`, close `X` at `right-4 top-4` |
| Sheet (`ui/sheet.tsx`) | Base UI Dialog | Same overlay. Sides top, bottom, left, right (default right). Left and right: `w-3/4 sm:max-w-sm`, `p-6`, `shadow-lg`. Used once (`customer-thread-sheet.tsx`) |
| Drawer (`ui/drawer.tsx`) | Base UI | 0 usages |
| DropdownMenu (`ui/dropdown-menu.tsx`) | Base UI Menu | Positioner + Popup, items use `onClick` (not `onSelect`). 1 use. Shortcut text `text-xs tracking-widest opacity-60` |
| Tooltip (`ui/tooltip.tsx`) | Base UI | `rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md`. 0 usages in modules |

Bottom-sheet motion utilities `.sheet-slide-up` (2.2s) and `.sheet-slide-down` (0.35s) are in `globals.css`.

### 6.5 Badges

- **Badge** (`ui/badge.tsx`): `rounded-full border px-2.5 py-0.5 text-xs font-semibold`. Variants `default`, `secondary`, `destructive`, `outline`. 7 uses.
- **Status badge** (`.status-badge` utility plus `DashboardStatusBadge`): pill, `px-2.5 py-0.5`, `text-xs font-medium`, `gap-1.5`, driven by `data-status="success|warning|info|danger|neutral"`. Comment in `dashboard-status-badge.tsx`: "green done, amber needs you, blue working, red failed."

- **Power mark** (`modules/shared/components/power-mark.tsx`): a `ShieldCheck` at `size-3.5` in `text-muted-foreground/70`, a focusable button with a Tooltip, placed immediately before whatever a Power guards (a button, a form card via `PageCard` `action`, or a page title via `PageHeader` `power`). The tip reads "Needs {Section} · {Action}" plus the Power string. Inside a dropdown menu it renders as a plain `span` (`inMenu`), so a menu item never holds another control. It shows only beside controls the signed-in role has, so a missing mark means a missing Power. Marks are off by default and only a superuser can turn them on: `DashboardPowerMarksToggle` (a `ShieldCheck` icon button with `aria-pressed`, beside the theme toggle in the top bar) stores the choice in this browser's localStorage (`power-marks`), and `DashboardShell` passes `isSuperuser && on` to `PowerMarksProvider`. Every mark sits inside a `flex items-center` row so it centres on the control beside it.
- **Power usage icon** (`modules/admin/components/admin-power-usage.tsx`): a `Route` icon at `size-3.5` beside each section of the role power checklist. Its Tooltip lists, per Action, the API routes and Assistant tools that refuse without the Power, from `ACCESS_POWER_USAGE`.

### 6.6 Tables and lists

- **Table** (`ui/table.tsx`): `text-sm`, head `h-12 px-4 text-muted-foreground font-medium`, cell `p-4`, row `border-b hover:bg-muted/50`, selected `bg-muted`. 1 usage (`admin-invite-code-table.tsx`).
- Elsewhere, "tables" are `<ul class="divide-y">` lists in cards, including Team members and pending invites (`px-6 py-5`, `hover:bg-accent/40`).

### 6.7 Navigation

- **Sidebar** (`ui/sidebar.tsx`, shadcn): width `16rem`, mobile `18rem`, icon-collapsed `3rem`, keyboard shortcut `b`, state cookie `sidebar_state` (7 days). Used with `collapsible="offcanvas"`. Menu button `p-2 text-sm`, active `bg-sidebar-accent font-medium`, focus `ring-2 ring-sidebar-ring`.
- **Dashboard sidebar** (`dashboard-sidebar.tsx`): brand text `text-base font-semibold tracking-tight`, then `TenantPicker`, grouped nav (Overview, Company, Store, Integration, plus an admin group of Invite codes and Roles for superusers), footer with user name (`text-xs text-muted-foreground`) and `LogoutButton`. Nav items are defined in `modules/dashboard/constants/dashboard-nav.ts`, each with a lucide icon. Store is Hours and Menu (`/store-menu`, sold out / back on). Company is Profile, Team, Master menu (`/menu`, with Items and Import subnav: edit, photos, delete), FAQs, then a `SidebarSeparator` and Chats, Unanswered, Assistant.
- **Top bar** (`dashboard-header.tsx`): `sticky top-0 z-10 h-14 border-b px-4 bg-background/80 backdrop-blur`, with `SidebarTrigger`, a vertical `Separator`, the current screen label, then a right cluster (view-only badge, theme toggle).
- **Breadcrumb** (`ui/breadcrumb.tsx`, `shared/components/app-breadcrumb.tsx`): present. Usage not measured.
- **Tabs** (`ui/tabs.tsx`): `TabsList h-10 rounded-md bg-muted p-1`, active trigger `bg-background shadow-sm`. 0 usages.

### 6.8 Chat

`ui/bubble.tsx` and `ui/message.tsx` provide the chat primitives. `Bubble` is `max-w-[80%]` with `data-align` and `data-variant`. Variants: `default` (`bg-primary`), `secondary`, `muted`, `tinted`, `outline`, `ghost`, `destructive`. `tinted` derives its fill from `--primary` with relative OKLCH (`oklch(from var(--primary) 0.93 calc(c*0.4) h)`), so it follows the active theme; hover states use `color-mix` against `--foreground`.

Tool cards (`modules/chat-bot/components/tools/`, one per agent tool, registered by tool name in `chat-bot-tool-registry.tsx`) sit inside a `muted` bubble and follow one pattern:

- Content is `text-sm`. A section title (menu category, FAQ category, "Weekly hours") is `text-base font-semibold`. The cafe or location line is `text-base text-muted-foreground`. Notes are `text-xs italic text-muted-foreground`.
- Each item (menu item, FAQ, hours rows, a change result) is a tile: `rounded-xl bg-accent px-4 py-3`. `bg-accent` is a step darker than the `muted` bubble in light mode. Tiles in a list are `gap-2` apart, sections `gap-4`, a section title and its tiles `gap-3`.
- Menu items are two columns: name, description and dietary `Badge`s on the left, price on the right (`tabular-nums`, right-aligned). An unavailable item is `text-muted-foreground`, struck through, and says "Unavailable".
- A card taller than `max-h-80` scrolls inside itself (`overflow-y-auto overscroll-contain pr-3`).
- No card has its own title or heading: the content comes first, as in the menu card. A tool that changes data shows the new value in a single tile, with the row label saying what changed ("Location", "Monday", "Special hours removed"). Availability uses the `.status-badge` utility (`success` / `neutral`).
- A tool that needs a choice first (location, country, FAQ scope) shows the question and the options as outline `Badge` chips (`ChatBotNeedsChoiceCard`).
- Hours read "08:00 to 16:00", "Closed" or "Not set", the same as the dashboard's `describeHours`.

The generic layout cards (used when a tool has no card of its own): title `text-sm font-medium text-muted-foreground`, body `text-sm`. Number card value `text-lg font-semibold tabular-nums`. Key-value card is a `dl` on `grid-cols-[auto_1fr] gap-x-3 gap-y-0.5`, keys `text-muted-foreground`, values `tabular-nums`. Table card is a plain `table text-sm tabular-nums` in `overflow-x-auto` with `text-muted-foreground font-medium` heads and `pr-3` cells (not the `ui/table` component). Error card is `text-sm text-muted-foreground` ("Couldn't load: ..."). Chat column is `max-w-2xl`, scroll area `no-scrollbar overscroll-contain p-4`.

### 6.9 Other

`Avatar` (Base UI), `Progress` (Base UI, track plus `bg-primary` indicator), `Skeleton` (`animate-pulse rounded-md bg-muted`, see 6.11), `Empty*` family, `Kbd`, `Carousel` (embla), `Toaster` (sonner), `chart.tsx` (recharts wrapper), `background-gradient-animation.tsx`.

### 6.10 Where native elements are still used

These have no matching `ui/` component or are a deliberate choice: the two radio buttons in `menu-item-locations-form.tsx`, the file input in `menu-import-upload.tsx`, and the hand-built chat table card. The timezone field in the sign-up form and the location checkboxes now use `Select` and `Checkbox`.

### 6.11 Skeleton loaders

The bone is `ui/skeleton.tsx`: `animate-pulse rounded-md bg-muted`. Each screen that waits on data has a sibling `*-skeleton.tsx` used as the `Suspense` fallback (and as the pending body of `CustomerThreadSheet`).

A skeleton copies the loaded layout. Card titles stay real (`PageCard title="Weekly hours"`). Rows keep the same padding and split as the data rows (`px-6 py-5` plus `divide-y`, or `p-6` for menu and FAQ items). Forms keep input-height bones. A single `h-32 w-full` (or `h-56`, `h-80`) block inside a card is the old pattern and is gone from the panel skeletons.

| Loaded piece | Bone |
|---|---|
| Row title | `h-4`, about `w-40` to `w-72` |
| Row secondary / `.stat-label` | `h-3` or `h-4`, narrower |
| Input / select | `h-10 w-full` (6.2) |
| Textarea | `h-20` or `h-24` |
| Primary / outline `size="sm"` | `h-9` and a short width (`w-24`, `w-28`) |
| Ghost `icon-sm` | `size-8 rounded-md` |
| Status pill | `h-5 w-20 rounded-full` (or similar) |
| Menu cover thumb | `size-10 rounded-lg` |
| Stat icon | `size-9` |
| Stat value | `h-8 w-16` |
| Chart | `h-56` row of 7 bars of mixed height (`DASHBOARD_ACTIVITY_DAYS`) |

Chat skeletons (`chat-bot-thread-skeleton.tsx`, `customer-thread-messages-skeleton.tsx`) reuse `Message` and `Bubble`. Bones inside the bubble use `bg-foreground/15` so they still read on `default` and `muted` fills.

While tenants are unknown, `TenantPicker` shows `h-5 w-36` (the one-cafe name line). `DashboardScopePickers` still falls back to nothing: a fake select would flash and then vanish for a cafe with one country and one location. FAQ subnav, when open and still loading, shows three short bones in `SidebarMenuSub`. The customer chat sheet titles the pending state with `sr-only` copy plus header bones, then the message skeleton.

Button pending stays `disabled` plus a label ("Saving..."). Sonner still uses `LoaderCircle animate-spin`. No button spinner.

Consumers: `dashboard-overview-skeleton.tsx`, `menu-panel-skeleton.tsx`, `faq-panel-skeleton.tsx`, `schedule-panel-skeleton.tsx`, `business-profile-panel-skeleton.tsx`, `widget-panel-skeleton.tsx`, `admin-invite-codes-skeleton.tsx`, `menu-import-list-skeleton.tsx`, `menu-import-review-skeleton.tsx`, `unanswered-question-list-skeleton.tsx`, `customer-thread-list-skeleton.tsx`, `customer-thread-view-skeleton.tsx`, `customer-thread-messages-skeleton.tsx`, `chat-bot-thread-skeleton.tsx`, `chat-bot-room-skeleton.tsx`.

---

## 7. Layout

- **Dashboard frame**: `SidebarProvider` then `Sidebar` plus `SidebarInset` containing `DashboardHeader` and `<main class="dashboard-content">`.
- **Content container** (`.dashboard-content`, verified): `max-width: 80rem`, centered, `flex-direction: column`, padding 1rem / 1.5rem at 768px.
- **Stat grid** (`.dashboard-grid`, verified): 1 column, 2 columns from 640px, 4 columns from 1280px. Used once (`dashboard-overview.tsx`).
- **Overview two-column**: `grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16`.
- **Auth pages**: centered `main` with `min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12`; card `max-w-sm`.
- **Chat**: `mx-auto w-full max-w-2xl` column inside a full-height flex container; scroll area uses `no-scrollbar overscroll-contain p-4`.
- **Max widths in use**: `max-w-sm` 5, `max-w-2xl` 4, `max-w-md` 3.
- **Breakpoints**: Tailwind defaults. Prefix counts: `lg:` 32, `sm:` 3, `md:` 2. The sidebar switches to a mobile sheet at `md` (768px, `ui/sidebar.tsx`). The `.dashboard-*` utilities use raw 640, 768 and 1280px media queries.
- **Safe areas / PWA**: `body` pads with `env(safe-area-inset-*)`, `viewport-fit=cover`, `apple-mobile-web-app-status-bar-style: default`, `-webkit-tap-highlight-color: transparent`, `overscroll-behavior-y: contain` (`globals.css`, `__root.tsx`). The `.first-run` interstitial is shown only under `@media (display-mode: standalone)`.

---

## 8. States

| State | Pattern | Verified in |
|---|---|---|
| **Hover (buttons)** | `hover:bg-primary/90`, `hover:bg-accent`, `hover:bg-secondary/80` per variant | `ui/button.tsx` |
| **Hover (rows/cards)** | `hover:bg-accent/40 transition-colors` (6 uses), `hover:bg-muted/50` on table rows | `dashboard-*`, `ui/table.tsx` |
| **Hover (links)** | `hover:text-foreground` from `text-muted-foreground`; underline for `link` button | `dashboard-attention.tsx`, `ui/button.tsx` |
| **Focus** | `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`, outline removed. Select trigger uses `focus:` rather than `focus-visible:` | `ui/button.tsx`, `ui/input.tsx`, `ui/select.tsx` |
| **Active (selected)** | Sidebar: `data-[active=true]:bg-sidebar-accent font-medium`. Tabs: `data-active:bg-background shadow-sm`. Select item: `data-highlighted:bg-accent` | `ui/sidebar.tsx`, `ui/tabs.tsx`, `ui/select.tsx` |
| **Disabled** | `disabled:opacity-50` plus `pointer-events-none` (buttons) or `cursor-not-allowed` (inputs). Menu import and forms disable submit on invalid or pending | `ui/button.tsx`, `faq-form.tsx` |
| **Loading** | Layout-matching `Skeleton` bones in a sibling `*-skeleton.tsx` (6.11). Sonner uses `LoaderCircle animate-spin`. A pending button is `disabled` with a label, no spinner | `ui/skeleton.tsx`, `*-skeleton.tsx` |
| **Empty** | A single `text-muted-foreground text-sm` (or `.stat-label p-6`) sentence, for example "No FAQs yet. Add the first one." The `Empty` component family exists but has 0 usages | `faq-list.tsx`, `dashboard-attention.tsx` |
| **Error (inline field/query)** | `text-xs text-destructive` for form and mutation errors; `text-destructive text-sm` for panel-level query errors. About 45 occurrences | `faq-form.tsx`, `*-panel.tsx` |
| **Error (route)** | `AppErrorComponent`: `bg-status-danger-soft` box with `text-status-danger` | `shared/components/app-error-component.tsx` |
| **Success** | Toasts through sonner; sign-in banners use `bg-status-success-soft text-status-success` | `ui/sonner.tsx`, `auth-signin.tsx` |
| **Done (checklist)** | Title gets `text-muted-foreground line-through`, a `Check size-3` icon, plus `sr-only` "Done / Not done" | `dashboard-setup-checklist.tsx` |
| **Read-only** | `DashboardStatusBadge tone="neutral"` reading "View only" in the top bar | `dashboard-header.tsx` |
| **Drag** | `active:cursor-grabbing` (menu board) | `menu/components/menu-tree-board.tsx` |
| **Keyboard** | Sidebar toggle is `Mod+B`. Assistant: `Mod+.` shows or hides (minimize), `Escape` closes (`useHotkeys`) | `ui/sidebar.tsx`, `chat-bot-sheet.tsx` |

**Motion** (verified, `globals.css`): `--animate-digest-fade-in` (0.5s, 8px rise), `--animate-jump`, `--animate-bot-excited` (0.7s hop + tilt on the assistant launcher Bot, `@media (hover: hover)`), `--animate-shake`, and the background gradient animations (`first` to `fifth`). Dialogs and popups use `animate-in/out`, `fade`, `zoom-95`, `slide-in-from-*` utilities. Interactive color changes use `transition-colors`. The `motion` library is a dependency.

---

## 9. Conventions

- **Utility**: `cn()` from `@/lib/utils` (`clsx` plus `tailwind-merge`).
- **Variants**: `cva` for Button, Badge, Sheet, Empty, Input-group, Bubble, Message.
- **Polymorphism**: the `render` prop, not `asChild`. `<Button render={<Link />} nativeButton={false}>`, `<SidebarMenuButton render={<Link />}>`, `<BreadcrumbLink render={<Link />}>`. Non-button wrappers (breadcrumb link, sidebar menu parts) use `useRender` + `mergeProps`. Parts carry `data-slot` attributes.
- **Custom CSS utilities** (`@utility` in CSS): `.dashboard-content`, `.dashboard-grid`, `.dashboard-card`, `.stat-label`, `.stat-value`, `.stat-icon`, `.status-badge`, `.squircle`, `.no-scrollbar`.
- **Icons**: `lucide-react`, sized `size-4` (nav, buttons, stat icon) or `h-4 w-4`.
- **Import alias**: `#/*` maps to `src/*` (`tsconfig.json`, `components.json`). The older `@/*` alias was removed.
- **Comment style**: `// -----` divider wrapping short `//` lines (per project memory, matches `globals.css` and components).
- **Class order**: no enforced order. Both `text-destructive text-sm` and `text-xs text-destructive` appear.
- **Linting**: `oxlint src`, no Tailwind lint rule found.

---

## 10. Reference: files

| Concern | File |
|---|---|
| Tokens, base layer, dashboard utilities, keyframes | `src/styles/globals.css` |
| shadcn config | `components.json` |
| UI primitives | `src/components/ui/*.tsx` |
| Shared composites | `src/modules/shared/components/` (`page-card.tsx`, `app-error-component.tsx`, `app-breadcrumb.tsx`) |
| Skeleton loaders | `src/components/ui/skeleton.tsx`, each module's `*-skeleton.tsx` (6.11) |
| Dashboard chrome | `src/modules/dashboard/components/` |
| Nav definition | `src/modules/dashboard/constants/dashboard-nav.ts` |
| Theme logic | `src/modules/shared/hooks/use-theme.ts`, `src/routes/__root.tsx` |

---

## 11. Inconsistencies found

1. ~~Two themes~~ **Fixed**: one theme in `globals.css`; `dashboard.css` and the `.amelie-dashboard` scope were removed.
2. **Card radius is a fixed 24px by choice.** Base `Card`, `PageCard` and `DashboardStatCard` use `rounded-3xl`, which ignores `--radius`, so changing the radius setting rounds controls but not cards. The list boxes inside cards are `rounded-2xl` (16px).
3. ~~Dead or foreign tokens~~ **Fixed**: unused Elise color variables, the unused font constants, the Google Fonts import and the never-rendered `EliseLogo`, `EliseLogoE` and `EliseSpark` components were removed. `ui-registry.md` is left in place: it is written by the repo's `imprint` workflow skill and still describes Elise components, so it stays stale until that workflow is revisited.
4. ~~Status tokens are bypassed~~ **Fixed**: banners and `AppErrorComponent` use `status-*` tokens, defined globally.
5. **Two reds.** `--destructive` (`oklch(0.577 0.245 27.325)` light) and `--status-danger` (`oklch(0.55 0.17 27)`) are different reds, and both appear in the UI.
6. ~~Mixed primitive libraries~~ **Fixed**: every primitive is Base UI; the 11 `@radix-ui/*` packages were removed from `package.json`. `components.json` still says style `default`, so the shadcn CLI will keep delivering Radix variants for new components; add them as Base UI by hand or switch the style.
7. ~~Focus ring differs~~ **Fixed for Select**: `SelectTrigger` now uses `focus-visible:` like the other inputs. Sidebar items still use `ring-sidebar-ring` without an offset (a separate token set).
8. ~~Broken sidebar shadow~~ **Fixed**: `hsl(var(--sidebar-*))` replaced with `var(--sidebar-*)`.
9. ~~Undefined `--radius-4xl`~~ **Fixed**: `drawer.tsx` now uses `rounded-3xl` (the intended 24px; the undefined var would have made the radius invalid, not 24px).
10. **Form labels are mixed.** Some forms have visible labels and some rely on `aria-label` plus a placeholder (`faq-form.tsx`). See 16 for the styles in use.
11. ~~`theme-color` hex mismatch~~ **Fixed**: the meta values are now `#fbfaf9` / `#110f0e`, converted from `--background`.
12. **Unused primitives.** `Tabs`, `Drawer`, `Empty`, `Tooltip`, `InputGroup` and `.squircle` have 0 usages in `modules/` and `routes/`. Empty states are hand-written sentences instead.
13. **Spacing conventions.** Card padding is `p-6` throughout, but list rows inside cards use `px-6 py-5` in the dashboard and `py-3` / `p-4` / `px-3` elsewhere. No documented rule.
14. ~~Import aliases~~ **Fixed**: all imports use `#/`.
15. ~~README is boilerplate~~ **Fixed**: `README.md` now describes this app.

16. **Five label styles.** Sign-in, sign-up and join (`/join/$token`): `text-[10px] uppercase tracking-wide text-muted-foreground`. Admin invite form and Team invite form: `.stat-label`. Business profile and location rows: `flex flex-col gap-1.5 text-sm` wrapped around the field. `ui/label`: `text-sm font-medium leading-none` (checkboxes and menu fields). FAQ, menu and schedule inputs: no visible label. Some of this was in uncommitted work when this was written, so recheck before standardizing.
17. **Table styling duplicated.** The admin invite table uses `ui/table`; the chat table card hand-rolls a table with its own classes.
18. **Menu board active state.** `menu-tree-board.tsx` marks the active item with `bg-primary/15 text-primary`, a pattern used nowhere else (sidebar uses `bg-sidebar-accent`).

## 12. Unknowns

- `/no-cafe` was read only for class names and `/admin` for layout. With one theme, both now share the same tokens as everything else.
- Intended z-index scale: only `z-10` (header), `z-50` (overlays and popups) were seen.
- Any design source (Figma, brand guidelines): none found in the repo.
