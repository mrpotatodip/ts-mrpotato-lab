# elise-frontend-web: Design

Rewritten 2026-11-08 from the code. The code is the source of truth. **Verified** means a file defines it. **Rule** means a reviewer rejects a change that breaks it. Desktop first: the shell is a 16.5rem sidebar plus a fluid column. Below 1024px the sidebar is forced to the 4.75rem rail and the content grids stack; only Overview has been checked at phone width.

## Direction

A premium near-white dashboard with a dark-gray primary. One cool neutral ramp (hue 258) does all the work: the sidebar is a slightly deeper gray, the page sits above it, and cards are a lighter gray so they lift off the page. Every border, hover and focus state is a translucent black laid over whichever surface is beneath. The primary action is a dark gray, one per screen. The active nav item is a quiet neutral fill with no indicator bar. Everything else is gray, so status and severity colour is the only colour that competes for attention, and it means something.

- **Rule** Depth comes from lightness steps, a 1px white top highlight and soft shadows, not from heavy borders. Surfaces get lighter as they come forward: sidebar, page, card, popover.
- **Rule** Colour carries meaning. Dark gray = act here. Green, red, amber, blue = state. Never use an accent colour for decoration.
- **Rule** Numbers are `tabular-nums` and sit large; labels sit small and muted above or beside them.

## Tokens

All tokens are CSS variables in `src/styles/globals.css` (`:root`), mapped to Tailwind in `@theme inline`. **Verified**. There are four themes, picked in a dialog that a button in the sidebar footer opens, above the account block (`ShellThemeSwitch`: one preview tile per theme, the chosen one marked; picking a tile applies it and closes the dialog; the collapsed rail shows the current theme's icon as the button, so a longer list costs no footer space) and kept in `localStorage` (`elise.theme`); `themeInitScript` in `__root.tsx` applies it before first paint as `data-theme` on `<html>`. **Default** is the soft-gray light theme in the table below and sets no attribute. **Daylight** (`data-theme="daylight"`) is brighter and firmer, on a white page with a painted sky at the top (the pictures in `public/theme-bgs/`, `bg-daylight-1.jpeg` to `-3.jpeg`, each 1778 by 592, rotating exactly as Moonlight's do (below), shown at 1.5 times their size and centred, their sides and bottom fading into white). The zoom is a choice: at 1.5 times the image is softer than at its natural size, so a larger source image is the way to a sharper sky. **Moonlight** (`data-theme="moonlight"`) is dark (`color-scheme: dark`) on a deep navy page with a night sky at the top (the pictures in `public/theme-bgs/`, each 1778 by 592, listed per theme in `THEME_SKIES` in `modules/shell/constants/theme-skies.ts`, which is the one place to edit to add a sky or change the timing (hold, fade, idle), for Daylight and Moonlight alike; `themeInitScript` picks one at random per theme on every page load (`data-sky-<theme>` is its index, `--<theme>-sky` its url) and preloads them all; `useSkyRotation` then crossfades through the list, but only while the page is idle: after 10s without input it plays, and it pauses, wherever it is, on the next input. `<html data-sky-state>` reads `playing` or `paused` for debugging. It stays still under `prefers-reduced-motion`. It is shown at 1.1 times the viewport, capped at 1950px, so it is barely enlarged and stays sharp; it starts below the 3.5rem top bar so the bar never clips the moon, and the art is left untouched (no veil or tint over it), so its colour and detail show as painted; the text halo on the page header keeps the title and description readable. Its sides and bottom fade into the page with the same eased mask as Daylight). Daylight and Moonlight make `--background`, `--sidebar`, `--card` and `--popover` translucent and blur what is behind `.bg-sidebar`, `.bg-card` and `.bg-popover`. Dialogs and sheets (`data-slot` `dialog-content` and `sheet-content`) use the card fill with a much stronger blur (32px, against 10px on cards), and the dialog body inside is clear; menus and tooltips keep the stronger popover fill so they stay legible over page text. **Midnight** (`data-theme="midnight"`) is Default turned dark: the same cool gray ramp, solid surfaces, no sky and no glass. It shares Moonlight's dark ink, status, mark and shadow tokens (one selector list in `globals.css`) and overrides only the surfaces. The table lists Default values. A new token must be defined for every theme in `globals.css`; the dark ones can share a block.

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
- **Rule** Ink and mark are two different jobs. A status or severity colour that carries **text** is an ink (`text-status-x`, `text-severity-x`) and has to clear 4.5:1. A colour used as a **shape** (a chart bar, a ring, a progress fill, a dot) is a mark (`bg-mark-success`, `-danger`, `-warning`, `-info`, `-neutral`, `-critical`, `-high`, `-medium`, `-low`, `-informational`): brighter and more saturated, opaque, and clearing 3:1 against a card. Never fill a shape with an ink at partial opacity: in Daylight that is what made the charts muddy. Measured 2026-11-09: marks are 3.09 or better in Default, 3.17 in Daylight and 6.13 in Moonlight; inks are 8.3 or better in all three. Daylight and Default share the marks (a teal-leaning green and a rose-leaning red that sit well on the pastel sky); Moonlight has its own, lighter set. Colour is never the only signal: every mark has a label or number beside it.
- **Verified** Contrast: body text on a card is above 9:1, muted text above 5:1, and the primary button is near-white on dark gray at well above 4.5:1 (Lighthouse reports 100 for accessibility). Status and severity inks are deliberately dark (lightness 0.38 to 0.44) so they read on the light surfaces and on their own tinted fills.
- **Verified** System font stacks only. No web fonts. Code, file paths, model names and report text use `font-mono`.
- **Verified** Radius `--radius: 0.75rem`. Cards use `rounded-xl`, controls `rounded-lg`, pills `rounded-full`.
- **Verified** Elevation tokens: `shadow-card` (cards), `shadow-raised` (the auth card, toasts), `shadow-control` (outline buttons, inputs), `shadow-primary` (the accent button, with a soft accent glow).
- **Verified** One soft white glow at the top right of the page (`body` background).
- **Verified** Icons are `lucide-react` at one thin stroke (1.5), set once for every `svg.lucide` in `globals.css`.

## Layout

`routes/_app/route.tsx` and `routes/prototype/route.tsx` both render `ShellFrame` from the `shell` module (`src/modules/shell/`): the sidebar, the topbar and the `main` landmark. They differ only in where the sidebar data comes from.

- **Sidebar** (`ShellSidebar`, 16.5rem, or a 4.75rem icon rail when collapsed): sticky, full height, and deliberately small. It is for going places, not for reading status, so it stays calm and short.
  - **Two groups, no headings**: the work (Overview, Repositories, Scans, Files) and, under a hairline, the account (Connections, and Team for admins only). Each is its own `nav` landmark (`Main`, `Account`), so a screen reader announces the split, and the gap between them is the hairline plus 12px of padding, not extra margin on any one row. Repositories comes before Scans because the data runs repository, branch, scan. Connections is for everyone, because members need to read why a private repository cannot be scanned; only its connect and disconnect buttons are for admins. While `/github/callback` is open, Connections is the active item, although the URL is not under it. A section label appears only where it separates something (a dev-only Preview group); a heading over a single item with the same name is noise.
  - **Scans** is a plain link with a count. A small pulsing dot sits beside the count while any scan is queued or running (and a screen reader hears "N in progress").
  - **Repositories** is a link; when the account has two or more repositories it also has a chevron (a separate button, so the link and the toggle never share a click) that shows the five most recently scanned repositories, one row each, plus "View all repositories". With one repository there is no chevron. The open or closed choice is kept in `localStorage` (`elise.sidebar.repos`, open by default). On a repository page the child you are on is highlighted and the parent is not.
  - **Children are quiet**: `owner/` in muted text and `name` in full weight (the owner is cut first when the row is too long). A repository's latest scan shows one small mark: a green dot for succeeded, a red dot for failed, a spinner while a scan is in progress. A private repository also shows a small muted lock after its name: it states a fact and carries no status colour. Nothing else competes for attention, and there are no red crosses.
  - **Active** is the neutral `bg-accent` fill with full-strength text, with no bar or coloured icon. The sidebar says which section the page is in, by its URL: a scan page keeps **Scans** active even though its breadcrumb runs through the repository and branch. The breadcrumb says where the page sits in the data. Do not highlight a second item to make the two agree.
  - **Collapse** with the panel button or Ctrl/Cmd+B. The choice is kept in `localStorage` (`elise.sidebar.collapsed`). The rail keeps one icon per destination with a tooltip, shows a pulsing dot on Scans while anything is running, and shrinks the account block to an avatar and sign-out. It never shows the children.
  - **First run**: with no scans, a dashed "Run your first audit" card sits under the list.
  - The layout feeds the sidebar from the scans query (`scanSidebarItems`: repositories by newest scan, the running count, the total), so the shell module never imports the scan module. In the demo screens the children link to the demo scan list.
- **Content**: `main`, `max-w-7xl` (1280px), `px-8 py-8`, `gap-8` between sections. The container fills the space beside the sidebar and only centres on very wide screens (beyond about 1550px of window width), so on a laptop the content sits flush against the sidebar gutter and widens, rather than shifts, when the sidebar collapses. Each page starts with `ShellPageHeader` (title `text-[26px]`, one muted description line, optional actions).
- **Rule** Every route renders inside the one `main` landmark. Pages return a fragment, not their own wrapper.

## Components (`src/components/ui/`)

`alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `empty`, `input`, `label`, `progress`, `radio-group`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `table`, `tabs`, `textarea`, `tooltip`. **Verified** by listing the folder.

- **Rule** Every interactive or structural control is a shadcn component on Base UI (`@base-ui/react`), never a hand-built `<select>`, tab strip, progress bar or tooltip. `components.json` still says `style: default`, so `pnpm dlx shadcn add` would fetch Radix versions: write a new primitive on the matching `@base-ui/react/*` part instead, in the same shape as the files already here (`data-slot`, `cn()`, tokens only).
- **Select**, **Tabs**, **Tooltip**, **Progress**, **Avatar**, **Separator**, **Collapsible** and **Checkbox** wrap their Base UI parts. **Checkbox** is a 16px box that fills with the accent and shows a check; put it in a `<label>` with the sentence it agrees to, as the GitHub notice does. **Tooltip** takes a `side`. `TooltipProvider` is mounted once, in `ShellFrame`.
- **Dialog** is a centred 40rem panel on a blurred backdrop (12px, the sheet's too), built like a card: a header strip (title and one sentence), a `DialogBody` that is the same rounded, bordered inset panel and scrolls, and a pinned `DialogFooter` with the confirmation and the actions. Esc and the close button dismiss it, and focus lands on the first field. **RadioGroup** has a `RadioCard` (a bordered choice with a title and a description) for choices that need explaining.
- **Sheet** (`ui/sheet`) is a right-hand panel up to 36rem wide for reading one record at a time: a tinted header (severity and status badges, "N of M", title, location), a scrolling single-column body, and a pinned footer with the decision and Previous / Next. Esc, the close button and the backdrop dismiss it; focus lands on the panel (not on a link inside it) and returns to the row that opened it. Use it instead of expanding a table row when the detail is longer than a few lines. `ScanFindingSheet` is the finding sheet: each row of the scan report opens it by a stretched button on the title, and the footer on the scan report points to the repository page, and the repository page passes its own facts and the decision select into the same sheet. The left and right arrow keys step between findings. Inside the sheet each section has a bold, colour-coded label (impact red, fix green, who or what to check amber, evidence neutral) over body text at 15px with generous leading. **Evidence** is a sentence with code in backticks, so `ScanEvidence` keeps the prose as prose, shows file names as small labels, and colours each snippet with TanStack Highlight (`lib/highlight.ts`, GitHub Light with the colours under 4.5:1 darkened). Short snippets sit inline; long ones become a block. The highlighter returns tokens, not HTML, so nothing is injected.
- **Alert** variants: `default`, `destructive` (gets `role="alert"`), `info`, `warning`.
- **Breadcrumb** is plain markup with `aria-current` on the last item. A trail follows the data, not the sidebar: a branch page is Repositories, repository, branch; a scan is Repositories, repository, the branch it read (a link back to the branch page) and `Scan <commit>`, or `One-off scan <commit>` when it has no branch. The names come from the route's loader (`useRouteNames`), so a new route that wants a rich trail returns them there. The scans list stays a plain `Scans`, because it is not under one branch.

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

## Shared patterns

- **Per-screen patterns** (overview, charts, scan report, scan list, repositories, decisions and status, files viewer, new scan) are in `DESIGN-SCREENS.md`. Review a screen against both files.
- **Card titles are `h2`**. Anything under a card title that needs a heading is `h3`.
- **Forms**: label above field, one error message under the field it belongs to (`aria-invalid`, `aria-describedby`, `role="alert"`). A toast is for failures that come back from the server, not for input the browser can check. Toasts appear bottom-right so they never cover the topbar actions.
- **Form copy** is conversational and informative:
  - **Ask a question.** A label is the question the person is answering ("Which repository should we audit?"), not the name of a database column ("Repository", "Skill", "Effort").
  - **Say what a choice means.** Every option has a plain-language name and one line on the trade-off ("Full audit: a deeper, multi-step review... takes longer and uses more budget"). The raw value (`lite`, `full`) is never the label.
  - **Help before the mistake.** One helper line under a field says what is accepted and what is not ("Private repositories can't be cloned").
  - **Errors say how to fix it.** "That doesn't look like a GitHub repository link. Use the form https://github.com/owner/name." Never "Invalid input".
  - **Show only what applies.** The coverage question appears only for a full audit. Rarely changed settings sit under "Advanced settings".
  - **Confirm in a sentence.** The footer always says what is about to run ("You're about to run a quick review on owner/name with Claude Sonnet 5.5") and what happens next.
  - **Buttons name the action.** "Start audit", not "Submit".
- **Loading**: `Skeleton` inside `Suspense`. **Refresh** shows a spinning icon while any query is fetching.
- **Rule** Cache is cleared on sign-out (`queryClient.clear()`), because route loaders read the cache first.

## Demo screens

`/prototype` (dev only; production answers 404) previews the dashboard with a busy account, so layouts can be judged before real data exists. Nothing on it is saved or sent.

- **Pages**: `/prototype/overview` and `/prototype/scans`, which reuse the real `ScanOverview` and `ScanList`, plus `/prototype/scans/$scanId` for reports. The index lists five featured reports: running, queued, clean, failed, and a 16-finding full audit with a long report.
- **Data**: about 40 deterministic scans (every status, skill, model, effort, a very long repository name) generated in `modules/scan/prototypes/scan-prototype-data.ts`. The overview figures are computed from those scans, so the screens agree with each other.
- **Isolation**: the routes sit under their own `QueryClientProvider` whose cache is seeded in memory and never refetches, so demo data cannot leak into the real pages. Links inside the demo stay in the demo (`useScanLinkMode`). The new-scan form is not shown, so no real scan can be started from a demo.
- **Rule** When a new component is added, check it on the demo screens before real data exists. The demo has already caught wrapping badges.
- **Rule** Delete `modules/scan/prototypes/` and `routes/prototype/` once real data makes them redundant, per `docs/standards/react.md` 1.6.
- **Rule** Reading text (a hint, an explanation, an impact line) is 14px or larger, has a line height of 1.5 or more, and runs at most about 65 characters per line (`max-w-prose`). 12px is for labels, table headers, badges, timestamps and file paths.
- **Rule** A link or control is at least 24px tall (`min-h-6`), a button or select at least 32px. Space follows one scale: 6px from a heading to its hint, 12px from a hint to its object, 24px between groups, 32px between cards. Measure it with `measure.js` in the `chrome-review` skill, and do not judge it by eye.

## Design standard

A screen is accepted when a reviewer would score it **9 or higher out of 10** against this list of ten. Score each, then average; any single item below 7 fails the screen.

1. **Hierarchy**: the eye lands on the page title, then the numbers, then the actions, in that order.
2. **Consistency**: one icon style, one radius family, one spacing rhythm (multiples of 4px, gaps of 16, 24, 32).
3. **Contrast**: text 4.5:1 or better, large text and UI edges 3:1 or better, measured, not guessed.
4. **Colour meaning**: one accent for action, status and severity colours for state, nothing decorative.
5. **Data honesty**: no invented numbers, consistent number formats, empty and failed states designed, not blank. A failed or missing file says what happened and what to do next, and is not retried when the answer is a 404. Repeated rows (the same repository in the sidebar tree) carry a time or day hint so they can be told apart.
6. **Interaction**: hover, focus-visible, pressed and disabled all visible; no dead controls. A list of more than a handful of rows has a status filter with counts and a search, and a filter that matches nothing shows an empty state with a way out ("Clear filters").
7. **Accessibility**: Lighthouse accessibility 100, one `main`, labelled controls, links announced as links. Every route sets its own title (`Page · Elise`, WCAG 2.4.2; a test enforces it), and the shell opens with a skip-to-content link that targets `main`.
8. **Polish**: nothing clipped, misaligned or unexplained; copy is short and plain.
9. **Balance**: a page is a few aligned rows, not a pile of cards. Cards in a row share one height and one header shape (a 15px title, one 14px line). Gaps between cards are 32px and card padding 24px. A page leads with one thing to decide, and values that are 0 are muted so they do not compete with it.
10. **Restraint**: colour marks state, not decoration. Every scan status is a pill on every screen, including a green "Succeeded" (`ScanStatusBadge`, no quiet variant), so a reader can see that a scan finished. A failure, a running scan and a finding are coloured too. A page uses neutral surfaces and at most the few colours that carry state, never a colour for decoration, and each colour keeps one meaning on every screen.

A rating names all ten scores and their average. Never report a rating for a subset of the items as if it were the page's rating. A reviewer should re-score before accepting a change.

## Known gaps

- Phone and tablet widths are built (the sidebar becomes the icon rail below 1024px, grids stack, tables scroll) but only Overview was checked at 390px. The other pages are untested there.
- Moonlight and Daylight contrast on the glass surfaces is not yet measured; the auth pages have no theme switch.
- The auth pages share the card and tokens but have no shell, so they carry only the "Elise / Security audits" wordmark. The logo is still to come.
- Scan data has no history, so the overview has no trend lines or sparklines; adding one needs an engine endpoint.
- Forms use `useState`, not TanStack Form (`docs/standards/react.md` 5.4). Not migrated here.
- Times render in UTC on the server and the first client render, then switch to the viewer's zone once hydrated (`useHydrated`), so the first paint shows UTC for a moment.
