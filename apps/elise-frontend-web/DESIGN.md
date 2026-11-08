# elise-frontend-web: Design

Rewritten 2026-11-08 from the code. The code is the source of truth. **Verified** means a file defines it. **Rule** means a reviewer rejects a change that breaks it. Desktop first: the shell is a 16.5rem sidebar plus a fluid column. Below 1024px the sidebar is forced to the 4.75rem rail and the content grids stack; only Overview has been checked at phone width.

## Direction

A premium near-white dashboard with a dark-gray primary. One cool neutral ramp (hue 258) does all the work: the sidebar is a slightly deeper gray, the page sits above it, and cards are a lighter gray so they lift off the page. Every border, hover and focus state is a translucent black laid over whichever surface is beneath. The primary action is a dark gray, one per screen. The active nav item is a quiet neutral fill with no indicator bar. Everything else is gray, so status and severity colour is the only colour that competes for attention, and it means something.

- **Rule** Depth comes from lightness steps, a 1px white top highlight and soft shadows, not from heavy borders. Surfaces get lighter as they come forward: sidebar, page, card, popover.
- **Rule** Colour carries meaning. Dark gray = act here. Green, red, amber, blue = state. Never use an accent colour for decoration.
- **Rule** Numbers are `tabular-nums` and sit large; labels sit small and muted above or beside them.

## Tokens

All tokens are CSS variables in `src/styles/globals.css` (`:root`), mapped to Tailwind in `@theme inline`. **Verified**. There is one theme, and it is light: `color-scheme: light`, no `.dark` class, no dark theme.

| Role | Token | Value (oklch) |
|---|---|---|
| Sidebar | `bg-sidebar` | 0.93 |
| Page | `bg-background` | 0.958 |
| Card | `bg-card` | 0.99 |
| Popover, toast | `bg-popover` | 0.998 |
| Muted fill | `bg-muted` | 0.94 |
| Text | `text-foreground` | 0.22 |
| Secondary text | `text-muted-foreground` | 0.36 |
| Border | `border-border` | black at 9% |
| Field border | `border-input` | black at 16% |
| Hover fill, active nav | `bg-accent` | black at 5.5% |
| Primary | `bg-primary` | 0.27, a deep dark gray, text on it near-white |
| Accent as text or tint | `text-primary-ink` | 0.30 |

- **Rule** Use semantic classes. No hex values and no raw palette classes (`bg-zinc-800`, `text-red-500`) in a feature module.
- **Rule** Status colour is a pair: `text-status-x` on `bg-status-x-soft` with a `border-status-x/25` edge. The soft fill is the same hue at about 13% alpha, so it works on any surface. States: `success`, `danger`, `warning`, `info`, `neutral`.
- **Rule** Severity has its own five tokens (`severity-critical`, `-high`, `-medium`, `-low`, `-informational`): red, orange, yellow, blue, gray. Use them for severity only.
- **Verified** Contrast: body text on a card is above 9:1, muted text above 5:1, and the primary button is near-white on dark gray at well above 4.5:1 (Lighthouse reports 100 for accessibility). Status and severity inks are deliberately dark (lightness 0.38 to 0.44) so they read on the light surfaces and on their own tinted fills.
- **Verified** System font stacks only. No web fonts. Code, file paths, model names and report text use `font-mono`.
- **Verified** Radius `--radius: 0.75rem`. Cards use `rounded-xl`, controls `rounded-lg`, pills `rounded-full`.
- **Verified** Elevation tokens: `shadow-card` (cards), `shadow-raised` (the auth card, toasts), `shadow-control` (outline buttons, inputs), `shadow-primary` (the accent button, with a soft accent glow).
- **Verified** One soft white glow at the top right of the page (`body` background).
- **Verified** Icons are `lucide-react` at one thin stroke (1.5), set once for every `svg.lucide` in `globals.css`.

## Layout

`routes/_app/route.tsx` and `routes/prototype/route.tsx` both render `ShellFrame` from the `shell` module (`src/modules/shell/`): the sidebar, the topbar and the `main` landmark. They differ only in where the sidebar data comes from.

- **Sidebar** (`ShellSidebar`, 16.5rem, or a 4.75rem icon rail when collapsed): sticky, full height, and deliberately small. It is for going places, not for reading status, so it stays calm and short.
  - **One list, no repeated headings**: Overview, Scans, Repositories and Team (admins only). A section label appears only where it separates something (a dev-only Preview group); a heading over a single item with the same name is noise.
  - **Scans** is a plain link with a count. A small pulsing dot sits beside the count while any scan is queued or running (and a screen reader hears "N in progress").
  - **Repositories** is a link; when the account has two or more repositories it also has a chevron (a separate button, so the link and the toggle never share a click) that shows the five most recently scanned repositories, one row each, plus "View all repositories". With one repository there is no chevron. The open or closed choice is kept in `localStorage` (`elise.sidebar.repos`, open by default). On a repository page the child you are on is highlighted and the parent is not.
  - **Children are quiet**: `owner/` in muted text and `name` in full weight (the owner is cut first when the row is too long). A repository whose latest scan succeeded has no marker. A scan in progress shows a small spinner, and a failed latest scan shows one small red dot. Nothing else competes for attention, and there are no red crosses.
  - **Active** is the neutral `bg-accent` fill with full-strength text, with no bar or coloured icon.
  - **Collapse** with the panel button or Ctrl/Cmd+B. The choice is kept in `localStorage` (`elise.sidebar.collapsed`). The rail keeps one icon per destination with a tooltip, shows a pulsing dot on Scans while anything is running, and shrinks the account block to an avatar and sign-out. It never shows the children.
  - **First run**: with no scans, a dashed "Run your first audit" card sits under the list.
  - The layout feeds the sidebar from the scans query (`scanSidebarItems`: repositories by newest scan, the running count, the total), so the shell module never imports the scan module. In the demo screens the children link to the demo scan list.
- **Content**: `main`, `max-w-7xl` (1280px), `px-8 py-8`, `gap-8` between sections. The container fills the space beside the sidebar and only centres on very wide screens (beyond about 1550px of window width), so on a laptop the content sits flush against the sidebar gutter and widens, rather than shifts, when the sidebar collapses. Each page starts with `ShellPageHeader` (title `text-[26px]`, one muted description line, optional actions).
- **Rule** Every route renders inside the one `main` landmark. Pages return a fragment, not their own wrapper.

## Components (`src/components/ui/`)

`alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `collapsible`, `dialog`, `empty`, `input`, `label`, `progress`, `radio-group`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `table`, `tabs`, `textarea`, `tooltip`. **Verified** by listing the folder.

- **Rule** Every interactive or structural control is a shadcn component on Base UI (`@base-ui/react`), never a hand-built `<select>`, tab strip, progress bar or tooltip. `components.json` still says `style: default`, so `pnpm dlx shadcn add` would fetch Radix versions: write a new primitive on the matching `@base-ui/react/*` part instead, in the same shape as the files already here (`data-slot`, `cn()`, tokens only).
- **Select**, **Tabs**, **Tooltip**, **Progress**, **Avatar**, **Separator** and **Collapsible** wrap their Base UI parts. **Tooltip** takes a `side`. `TooltipProvider` is mounted once, in `ShellFrame`.
- **Dialog** is a centred 40rem panel on a lightly blurred backdrop, built like a card: a header strip (title and one sentence), a `DialogBody` that is the same rounded, bordered inset panel and scrolls, and a pinned `DialogFooter` with the confirmation and the actions. Esc and the close button dismiss it, and focus lands on the first field. **RadioGroup** has a `RadioCard` (a bordered choice with a title and a description) for choices that need explaining.
- **Sheet** (`ui/sheet`) is a right-hand panel up to 36rem wide for reading one record at a time: a tinted header (severity and status badges, "N of M", title, location), a scrolling single-column body, and a pinned footer with the decision and Previous / Next. Esc, the close button and the backdrop dismiss it; focus lands on the panel (not on a link inside it) and returns to the row that opened it. Use it instead of expanding a table row when the detail is longer than a few lines. `ScanFindingSheet` is the finding sheet: each row of the scan report opens it by a stretched button on the title, and the footer on the scan report points to the repository page, and the repository page passes its own facts and the decision select into the same sheet. The left and right arrow keys step between findings. Inside the sheet each section has a bold, colour-coded label (impact red, fix green, who or what to check amber, evidence neutral) over body text at 15px with generous leading. **Evidence** is a sentence with code in backticks, so `ScanEvidence` keeps the prose as prose, shows file names as small labels, and colours each snippet with TanStack Highlight (`lib/highlight.ts`, GitHub Light with the colours under 4.5:1 darkened). Short snippets sit inline; long ones become a block. The highlighter returns tokens, not HTML, so nothing is injected.
- **Alert** variants: `default`, `destructive` (gets `role="alert"`), `info`, `warning`.
- **Breadcrumb** is plain markup with `aria-current` on the last item.

- **Button** variants: `default` (accent, the one primary action), `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default` 36px, `sm` 32px, `lg` 40px, `icon`, `icon-sm`. Press moves the button down 1px.
- **Rule** A link that looks like a button is a `Link` with `buttonVariants()`. Do not use `Button render={<Link/>}`: Base UI then gives the link a button role and logs a console error.
- **Badge** variants: `default`, `secondary`, `destructive`, `success`, `warning`, `info`, `neutral`, `outline`. A status badge carries a leading dot in the current colour.
- **Card**: `overflow-hidden rounded-xl border bg-card shadow-card`, built in two parts.
  - **Header** (`CardHeader`): a slightly deeper strip (`bg-muted/50`) with the 15px semibold title and an optional muted line.
  - **Body** (`CardContent`): an inset panel that overlaps the bottom of the header by one corner radius (`-mt-4`), with `rounded-t-xl`, a top border and `bg-card`. The curve of the border where it meets the header is the signature of the style.
  - **Rule** Every card with a header uses `CardHeader` then `CardContent`. Nothing sits between them and nothing draws its own divider (`border-t`) under the header. A table or list that runs edge to edge goes in `<CardContent className="overflow-hidden p-0">`.
  - A stat card has no header, so it is just `Card` with `p-5`.
- **Table**: header row is a muted band with 12px uppercase tracked labels; cells are `px-5 py-3.5`; rows highlight on hover.
- **Input and select**: 40px, inset (`bg-background/60`), `shadow-control`, border brightens on hover, 2px accent ring on focus. The select popup is a rounded `bg-popover` panel with `shadow-raised` and a check on the chosen item.
- **Empty** states always carry an icon tile, a title and one line saying what to do next.

## Patterns in use

- **Stat card** (overview): label and an icon tile (tinted by meaning) on one row, a 34px number, then one muted line of context that is derived from real data.
- **Scan activity chart**: a stacked bar per day for the last 14 days (succeeded, failed, in progress), dashed gridlines with a value axis, and a tooltip on every bar that lists the day and its counts. Each bar is a labelled button, so keyboard and screen-reader users get the same numbers. The data is derived from the scans list; the chart needs no endpoint.
- **Success ring**: an SVG ring with the percentage in the middle and two tinted tiles for succeeded and failed counts.
- **Severity chart**: a segmented bar for share, then one row per severity with dot, label, `Progress` bar, count and percent. Colour is never the only signal: every row has a text label and a number.
- **Lists**: a repository is shown as muted `owner/` plus the `name` in full weight. Times are short (`Nov 8, 10:12 AM`) in muted tabular numerals.
- **Status panels** on a scan page are `Alert`s: failed is the destructive variant with the engine's message; queued and running is the info variant with a spinner.
- **Scan report** (`ScanDetail`) is written for the person who has to decide what to do: run facts as labelled pairs (kind of review, model, effort, started, took, code read), four summary tiles (findings, needs a person, new since last scan, cost), a findings table whose rows open a side sheet with the impact, evidence, suggested fix and what to check in one column, a "can this commit ship?" card, and a "what changed" card that groups findings as came back, new, not re-checked, still open and fixed. Each group says what it means and what to do. Not re-checked is a warning: treat those as still open. Raw values (`lite`, `low`) never appear as labels: use the option copy in `constants/`.
- **Scan list** rows answer "what did it find and cost" without opening: findings with severity dots, a "to check by hand" count, review kind and model, cost. Older scans load with "Load older scans"; the header shows `N+` while more exist.
- **Repositories** follow the same rule: decide first, browse second. The list opens with four tiles across every repository (open findings, came back, needs a person, not re-checked), then rows sorted by what needs attention (findings that came back, then the most severe). The detail page opens with run facts and the same four tiles for that repository, then findings that open in the side sheet (impact, evidence, fix, state, where each finding was first seen or fixed, and the decision select, with the select also kept inline on each row), with a search and a state filter that shows a count per state, then the scan history with findings, time and cost. A failed scan in the history says why in one line (`scanFailure`), not just "No report".
- **Decisions and status** (`modules/finding`): a finding has two truths, what scans found (open, came back, fixed by a scan) and what a person decided (open, fixed, false positive, accepted risk). The reader gets one answer from both (`findingStatusKey`): a scan that proved a fix wins, then a person's decision, then the scan state. The status badge says it in a word ("Fixed by a scan", "Marked fixed", "False positive", "Risk accepted", "Came back", "Open"), the row shows who decided and when under the decision select, and the sheet opens with a status banner (what happened, who, when, what it means next, and the reason or note). A finding a scan fixed shows no select: no decision is needed. "Marked fixed" says plainly that no scan has confirmed it, and that a later scan finding it again shows as Came back. The repository list filters follow the same grouping as the Open findings tile (needs action, decided by a person, fixed by a scan, every finding), each with a count, so the list and the tile never disagree. **Accepted risk** opens a dialog for a reason and a duration (7 to 90 days), says what will happen in a sentence, and is only enabled for account admins (the option shows "Account admins only" for others). A decision updates the row at once; the counts refresh in the background. A stat tile is `ShellStatTile`.
- **Card titles are `h2`**. Anything under a card title that needs a heading is `h3`.
- **Files viewer**: `Tabs` (mono pills, selected pill tinted, arrow-key navigation) over an inset `pre` with mono text. An empty file shows "This file is empty."
- **Forms**: label above field, one error message under the field it belongs to (`aria-invalid`, `aria-describedby`, `role="alert"`). A toast is for failures that come back from the server, not for input the browser can check. Toasts appear bottom-right so they never cover the topbar actions.
- **Form copy** is conversational and informative:
  - **Ask a question.** A label is the question the person is answering ("Which repository should we audit?"), not the name of a database column ("Repository", "Skill", "Effort").
  - **Say what a choice means.** Every option has a plain-language name and one line on the trade-off ("Full audit: a deeper, multi-step review... takes longer and uses more budget"). The raw value (`lite`, `full`) is never the label.
  - **Help before the mistake.** One helper line under a field says what is accepted and what is not ("Private repositories can't be cloned").
  - **Errors say how to fix it.** "That doesn't look like a GitHub repository link. Use the form https://github.com/owner/name." Never "Invalid input".
  - **Show only what applies.** The coverage question appears only for a full audit. Rarely changed settings sit under "Advanced settings".
  - **Confirm in a sentence.** The footer always says what is about to run ("You're about to run a quick review on owner/name with Claude Sonnet 5.5") and what happens next.
  - **Buttons name the action.** "Start audit", not "Submit".
- **New scan** is a dialog (`ScanNewDialog`), opened from the topbar, from the empty state of the scans list, and as "Scan again" on a repository page. It never asks for a link the account already has: the repository field is a select of repositories already scanned (newest first, each with its last result), and "A different repository" reveals the link field. With none scanned, the link field shows at once. "Scan again" opens it with that repository chosen. A repository with a queued or running scan shows a warning and disables "Start audit", because the engine allows one active scan per repository. A bad link moves focus to the link field. In demo screens it never calls the engine and shows "This is a demo, so no audit was started."
- **Loading**: `Skeleton` inside `Suspense`. **Refresh** shows a spinning icon while any query is fetching.
- **Rule** Cache is cleared on sign-out (`queryClient.clear()`), because route loaders read the cache first.

## Demo screens

`/prototype` (dev only; production answers 404) previews the dashboard with a busy account, so layouts can be judged before real data exists. Nothing on it is saved or sent.

- **Pages**: `/prototype/overview` and `/prototype/scans`, which reuse the real `ScanOverview` and `ScanList`, plus `/prototype/scans/$scanId` for reports. The index lists five featured reports: running, queued, clean, failed, and a 16-finding full audit with a long report.
- **Data**: about 40 deterministic scans (every status, skill, model, effort, a very long repository name) generated in `modules/scan/prototypes/scan-prototype-data.ts`. The overview figures are computed from those scans, so the screens agree with each other.
- **Isolation**: the routes sit under their own `QueryClientProvider` whose cache is seeded in memory and never refetches, so demo data cannot leak into the real pages. Links inside the demo stay in the demo (`useScanLinkMode`). The new-scan form is not shown, so no real scan can be started from a demo.
- **Rule** When a new component is added, check it on the demo screens before real data exists. The demo has already caught wrapping badges.
- **Rule** Delete `modules/scan/prototypes/` and `routes/prototype/` once real data makes them redundant, per `docs/standards/react.md` 1.6.

## Design standard

A screen is accepted when a reviewer would score it **9 or higher out of 10** against this list. Score each, then average; any single item below 7 fails the screen.

1. **Hierarchy**: the eye lands on the page title, then the numbers, then the actions, in that order.
2. **Consistency**: one icon style, one radius family, one spacing rhythm (multiples of 4px, gaps of 16, 24, 32).
3. **Contrast**: text 4.5:1 or better, large text and UI edges 3:1 or better, measured, not guessed.
4. **Colour meaning**: one accent for action, status and severity colours for state, nothing decorative.
5. **Data honesty**: no invented numbers, consistent number formats, empty and failed states designed, not blank. A failed or missing file says what happened and what to do next, and is not retried when the answer is a 404. Repeated rows (the same repository in the sidebar tree) carry a time or day hint so they can be told apart.
6. **Interaction**: hover, focus-visible, pressed and disabled all visible; no dead controls. A list of more than a handful of rows has a status filter with counts and a search, and a filter that matches nothing shows an empty state with a way out ("Clear filters").
7. **Accessibility**: Lighthouse accessibility 100, one `main`, labelled controls, links announced as links. Every route sets its own title (`Page · Elise`, WCAG 2.4.2; a test enforces it), and the shell opens with a skip-to-content link that targets `main`.
8. **Polish**: nothing clipped, misaligned or unexplained; copy is short and plain.

Scored 2026-11-08 against two reference dashboards, with the same eight items:

| | Hierarchy | Consistency | Contrast | Colour meaning | Data honesty | Interaction | Accessibility | Polish | Average |
|---|---|---|---|---|---|---|---|---|---|
| Nexus (reference) | 8 | 8 | 6 | 6 | 7 | 7 | 6 | 7 | 7.5 |
| Fundcy (reference) | 8.5 | 7 | 6 | 6 | 8 | 8 | 6 | 9 | 8.0 |
| Elise, first pass | 9 | 9 | 9 | 9.5 | 8.5 | 8.5 | 10 | 8.5 | 9.0 |
| Elise, after the sidebar tree and `/chrome-review` fixes | 9 | 9.5 | 9.5 | 9.5 | 8.5 | 8.5 | 10 | 8.5 | 9.1 |
| Elise, after the industry-standard pass (titles, skip link, filters, designed file errors, distinct sidebar rows) | 9 | 9.5 | 9.5 | 9.5 | 9.5 | 9 | 10 | 9.5 | 9.5 |

The Elise scores are the author's, measured on every route in desktop Chrome (signed out and signed in, real and demo data). The last row also meets the industry-standard rules now listed under items 5 to 7. Interaction loses half a point because collapsed-rail tooltips were not confirmed in the browser; Hierarchy stays at 9 until the overview has trend data. The demo report breadcrumb shows "Demo screens" with no "Report" crumb. A reviewer should re-score before accepting a change.

## Known gaps

- Phone and tablet widths are built (the sidebar becomes the icon rail below 1024px, grids stack, tables scroll) but only Overview was checked at 390px. The other pages are untested there.
- No dark theme, and no theme switch.
- The auth pages share the card and tokens but have no shell, so they carry only the "Elise / Security audits" wordmark. The logo is still to come.
- Scan data has no history, so the overview has no trend lines or sparklines; adding one needs an engine endpoint.
- Forms use `useState`, not TanStack Form (`docs/standards/react.md` 5.4). Not migrated here.
- Times render in UTC on the server and the first client render, then switch to the viewer's zone once hydrated (`useHydrated`), so the first paint shows UTC for a moment.
