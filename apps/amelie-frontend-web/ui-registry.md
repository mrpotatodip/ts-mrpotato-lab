# UI registry

Last updated: 2026-09-15

### EliseCard

File: `src/modules/shared/components/elise-card.tsx`
Last updated: 2026-09-09

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-card` (shadcn Card) |
| Border           | `border-foreground/6` |
| Border radius    | `rounded-[26px]`, bottom often `rounded-b-[30px]` |
| Text — primary   | `text-foreground` |
| Text — secondary | `text-foreground/58`, labels `text-xs uppercase tracking-wider` |
| Spacing          | content `p-6`, inner gap `gap-5` |
| Shadow           | `shadow-none` |
| Accent usage     | deltas `text-delta-up` / `text-delta-down` |

**Pattern notes:**
Channel rows (`ChannelInfo` / `ChannelsItem`) and folder cards share this chrome. Do not add drop shadows or a second inner card radius. Channel titles are `text-2xl font-normal` with `DISPLAY_FONT`; game kickers are `text-[11px] uppercase tracking-wider text-foreground/58`. List cards stack avatar + meta, then subscribe/unsubscribe (`h-10`, zinc mute, not primary) plus a ghost overflow. Folders use a diagonal `CardAvatarStack` (`size="md"`, overlap `-mr-20` / `mt-2` / `mt-4`) and link to `/folders/$id`.

### ChannelItem

File: `src/modules/channels/components/channels-item.tsx`, `channels-item-subs-unsubs.tsx`
Last updated: 2026-09-15

| Property         | Class |
| ---------------- | ----- |
| Background       | EliseCard |
| Border           | `border-foreground/6` |
| Border radius    | `rounded-b-[26px]` |
| Text — primary   | title `text-2xl font-normal`, `DISPLAY_FONT` |
| Text — secondary | game `text-[11px] uppercase tracking-wider text-foreground/58` |
| Spacing          | content `flex-col gap-4`, avatar row `gap-3`, meta `gap-0.5` |
| Hover state      | title `hover:underline` |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Unsubscribe/Subscribe sit under the avatar row, not in the meta column. Overflow (Add to folder) only when subscribed.

### SubscriptionFolderItem

File: `src/modules/subscription-folders/components/subscription-folders-item.tsx`
Last updated: 2026-09-15

| Property         | Class |
| ---------------- | ----- |
| Background       | EliseCard |
| Border           | `border-foreground/6` |
| Border radius    | `rounded-b-[26px]` |
| Text — primary   | name `text-2xl font-normal`, `DISPLAY_FONT` |
| Text — secondary | count `text-[11px] uppercase tracking-wider text-foreground/58` |
| Spacing          | row `gap-3`, copy column `gap-0.5` |
| Hover state      | name `hover:underline` |
| Shadow           | none |
| Accent usage     | accumulated `AssetValueStackAnimated` |

**Pattern notes:**
Empty folders omit the stack. Preview thumbs are the first three members that still resolve on the watchlist. Count copy is `N item(s)`, not channels. Name links to `/folders/$id`. New folders are created from a channel overflow (`Add to folder` → `Create new folder`), not a grid slot. Folder detail header overflow is Rename then Delete (chat thread overflow pattern). Delete keeps subscriptions; items return to Watchlists.

### AssetHistories

File: `src/modules/asset-histories/components/asset-histories-suspense-main.tsx`, `asset-histories-card.tsx`
Last updated: 2026-09-09

| Property         | Class |
| ---------------- | ----- |
| Background       | EliseCard |
| Border           | EliseCard `border-foreground/6` |
| Border radius    | `rounded-[26px] rounded-b-[30px]` |
| Text — primary   | `text-xl tabular-nums`, `DISPLAY_FONT`, NumberFlow |
| Text — secondary | `text-xs uppercase tracking-wider text-foreground/58` |
| Spacing          | `p-6`, columns `gap-5` |
| Shadow           | `shadow-none` |
| Accent usage     | `text-delta-up` / `text-delta-down` via `deltaColorClass`; sparkline `var(--delta-up)` / `var(--delta-down)` |

**Pattern notes:**
One sparkline at a time. Window is chosen with GameFilter-style `Button` pills (`1d` / `7d` / `30d`, `secondary` when selected). Price and window delta use the same NumberFlow + `DISPLAY_FONT` treatment as `AssetValueStackAnimated` (`text-xl tabular-nums`).

### EliseLogo / AuthHeader

File: `src/modules/shared/components/elise-logo.tsx`, `elise-logo-e.tsx`, `src/modules/auth/components/auth-header.tsx`
Last updated: 2026-09-11

| Property         | Class |
| ---------------- | ----- |
| Wordmark         | `EliseLogo`, size with `text-*`, `LOGO_FONT` (`Goblin One`) |
| Headline         | `text-xl font-light text-muted-foreground text-center` — one typeface, no highlight |
| Auth / unsubscribe card | `border-0 shadow-[0_8px_40px_12px_hsl(0_0%_0%/0.06)]` on Card |
| Spacing          | wordmark then copy `mt-5` |

**Pattern notes:**
Same headline copy as elise-frontend-website landing. Size the wordmark with `text-*`; do not swap back to `EliseMark` on auth screens. Do not highlighter-swipe any words in this copy.

### HighlightMark

File: `src/modules/shared/components/highlight-mark.tsx`
Last updated: 2026-09-22

| Property         | Class |
| ---------------- | ----- |
| Background       | swipe `bg-foreground/8` |
| Border           | none |
| Border radius    | none (rotated rect) |
| Text — primary   | `text-foreground`, `HIGHLIGHT_FONT` (`Libre Baskerville`) 700 roman, same size as surrounding copy |
| Text — secondary | surrounding copy stays `HEADLINE_FONT` (`Atkinson Hyperlegible`) |
| Spacing          | swipe inset `top-[0.24em] right-[0.04em] -bottom-[0.04em] left-[-0.08em]`, `-rotate-1`; swipe hidden below `lg` |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Compose `HighlightMark` + `HighlightMarkSwipe` + `HighlightMarkText`. `HighlightMarkPhrase` is the one-shot wrap for one word. Agent `**phrase**` copy goes through `renderHighlightMarks`, which splits highlights per word so the swipe can wrap to a new line, and turns `\n` into `<br />`. Chat answers stay on `renderInlineMarkdown` (`<strong>`). Auth headlines stay unhighlighted.

### InsightInfoLead

File: `src/modules/insights/components/insights-info.tsx`, `src/modules/shared/components/card-avatar-stack.tsx`
Last updated: 2026-09-11

| Property         | Class |
| ---------------- | ----- |
| Background       | EliseCard; thumbs `bg-card` squircle pad `p-[3px]` |
| Border           | EliseCard `border-foreground/6` |
| Border radius    | thumbs `squircle` |
| Text — primary   | narrative `font-semibold text-foreground` on update count and duration |
| Text — secondary | narrative `text-foreground/70`, `text-md md:text-xl`, `DISPLAY_FONT` |
| Spacing          | lead `items-start justify-between gap-8`; diagonal overlap `-mr-[4.25rem]`, `marginTop: index * 12` |
| Shadow           | none |
| Accent usage     | `+N` bubble `bg-secondary` / dark `bg-background` |

**Pattern notes:**
Copy left, `layout="diagonal"` thumbs right. Cap at `CARD_AVATAR_STACK_MAX` (3); `+N` sits on the right edge of the first image (`translate-x-1/2`). Do not go back to avatars-left or a 4+ banner. Body still uses `renderHighlightMarks`. Insight detail event rows reuse this same lead (`InsightEventItem`).

### InsightEventItem

File: `src/modules/insights/components/insights-event-item.tsx`
Last updated: 2026-09-12

| Property         | Class |
| ---------------- | ----- |
| Background       | EliseCard via `InsightInfo` |
| Border           | EliseCard `border-foreground/6` |
| Border radius    | thumbs `squircle` |
| Text — primary   | description `text-md md:text-lg`, `DISPLAY_FONT` |
| Text — secondary | caption `text-xs tracking-wider text-foreground/60 uppercase` |
| Spacing          | lead `items-start justify-between gap-8` |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Same as InsightInfoLead: copy left, `layout="diagonal"` thumbs right. Thumb links to `/channels/$id`. Do not put the image on the left.

### Hot channels rail

File: `src/modules/hot-cards/components/hot-cards-suspense-tile-main.tsx`, `hot-cards-tile-header.tsx`
Last updated: 2026-09-14

| Property         | Class |
| ---------------- | ----- |
| Background       | EliseCard via `ChannelsItem` |
| Border           | `border-foreground/6` |
| Border radius    | `rounded-[26px] rounded-b-[26px]` |
| Text — primary   | tile label `text-2xl font-bold lg:text-3xl`, `HEADLINE_FONT` |
| Text — secondary | More button `text-lg`, ghost |
| Spacing          | same `gap-6` column as recent watchlists |
| Shadow           | `shadow-none` |
| Accent usage     | heat score stack on the row |

**Pattern notes:**
Home right rail, under recent watchlists. Three random channels. Header matches SubscriptionsTileHeader (label + ghost More). More goes to `/hot-channels`.

### MenuItemImages

File: `src/modules/menu/components/menu-item-images.tsx`
Last updated: 2026-10-13

| Property         | Class |
| ---------------- | ----- |
| Background       | sheet `bg-card` |
| Border           | sheet `border`, `rounded-3xl` |
| Border radius    | thumbs `rounded-lg`, sheet `rounded-3xl` |
| List thumb       | `size-10` |
| Sheet thumb      | `size-24` |
| Text — primary   | title `text-lg font-semibold` |
| Text — secondary | description `text-sm text-muted-foreground`, errors `text-xs text-destructive` |
| Spacing          | sheet `p-6`, inset `inset-y-4 right-4`, list `gap-3`, body `mt-6 gap-4` |
| Hover state      | shadcn ghost/outline buttons |
| Shadow           | none |
| Accent usage     | Cover `Badge variant="secondary"` |

**Pattern notes:**
Opens from a ghost `icon-sm` Image control next to Delete on the item row. Sheet chrome matches `CustomerThreadSheet` (`inset-y-4 right-4`, `rounded-3xl`, overlay `bg-black/10`). Sheet thumbs are `size-24 rounded-lg object-cover`. Each photo row uses ghost `icon-sm` up/down arrows, then Cover (`outline` `sm`), then delete. Add photos is `Button variant="outline" size="sm"`. Cap is `MENU_ITEM_IMAGE_MAX`. First photo is Cover. The item row shows that cover left of the title (`size-10 rounded-lg`) with a primary count bubble (`Badge`, `min-w-5`, `text-[10px]`, `-top-1.5 -right-1.5`). The thumb is omitted when the item has no photo.

### WidgetAllowedOriginsCard

File: `src/modules/widget/components/widget-allowed-origins-card.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard (`bg-muted/60`, body `rounded-3xl border-t bg-card`) |
| Border           | PageCard |
| Border radius    | PageCard |
| Text — primary   | title via PageCard `text-lg` |
| Text — secondary | description via PageCard, empty warning `text-sm text-muted-foreground`, errors `text-xs text-destructive` |
| Spacing          | rows `space-y-2`, row `gap-2`, actions `mt-4` `gap-2`, error `mt-4` |
| Hover state      | ghost `icon-sm` remove, outline `sm` add, default `sm` Save |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Sits under the install snippet on Widget. Editors get one Input per row, ghost `icon-sm` Trash2 to remove, outline Add website, then Save. Staff see the stored origins as `text-sm break-all` with no add, remove, or Save. Empty list shows the iframe warning. Paste a full URL; the server keeps the origin.
