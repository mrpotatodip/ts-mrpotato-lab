# UI registry

Last updated: 2026-10-15

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

### CountryAddForm

File: `src/modules/country/components/country-add-form.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard body `bg-card` |
| Border           | none on the form; section footer `border-t` |
| Border radius    | Select/button `rounded-md` |
| Text — primary   | `text-sm` via Input/Select |
| Text — secondary | placeholders `text-muted-foreground` |
| Spacing          | form `flex flex-col gap-3`, field row `flex flex-wrap gap-2`, actions `mt-3 flex gap-2` |
| Hover state      | primary submit `size="sm"`, cancel `ghost` `size="sm"` |
| Shadow           | none |
| Accent usage     | errors `text-xs text-destructive` |

**Pattern notes:**
Matches menu/FAQ forms: no visible labels, `aria-label` plus placeholder, `SelectTrigger` `w-fit min-w-40`. Add starts as outline `size="sm"` in a `border-t p-6` footer, then expands to this form with Cancel, same as adding a menu item.

### CountryRow

File: `src/modules/country/components/country-row.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard body `bg-card` |
| Border           | list `divide-y` |
| Border radius    | none on the row |
| Text — primary   | name `text-sm font-medium` |
| Text — secondary | locations `text-muted-foreground text-sm` |
| Spacing          | row `flex items-center justify-between gap-4 p-6`, actions `gap-2` |
| Hover state      | none (menu item rows do not hover-fill) |
| Shadow           | none |
| Accent usage     | Archive `ghost` `size="sm"` |

**Pattern notes:**
Same list chrome as menu items: `PageCard` `contentClassName="p-0"`, `ul.divide-y`, `p-6` rows. Currency uses an unlabeled select (`w-fit min-w-40`) like the menu category field.

### LocationAddForm

File: `src/modules/location/components/location-add-form.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard body `bg-card` |
| Border           | none on the form; section footer `border-t` |
| Border radius    | Input/Select/button `rounded-md` |
| Text — primary   | `text-sm` via Input/Select |
| Text — secondary | placeholders `text-muted-foreground` |
| Spacing          | form `flex flex-col gap-3`, field row `flex flex-wrap gap-2`, actions `mt-3 flex gap-2` |
| Hover state      | primary submit `size="sm"`, cancel `ghost` `size="sm"` |
| Shadow           | none |
| Accent usage     | errors `text-xs text-destructive` |

**Pattern notes:**
Matches menu/FAQ/country add forms: no visible labels, `aria-label` plus placeholder, name `w-56`, `SelectTrigger` `w-fit min-w-40`. Add starts as outline `size="sm"` in a `border-t p-6` footer when there are several locations, then expands to this form with Cancel. A one-location cafe still uses a muted `link` button, same as adding a country.

### LocationRow

File: `src/modules/location/components/location-row.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard body `bg-card` |
| Border           | list `divide-y` |
| Border radius    | Input/Select `rounded-md` |
| Text — primary   | `text-sm` via Input/Select |
| Text — secondary | placeholders `text-muted-foreground` |
| Spacing          | row `p-6`, form `flex flex-col gap-3`, field rows `flex flex-wrap gap-2`, actions `mt-3 flex gap-2` |
| Hover state      | none (menu item rows do not hover-fill); Save `size="sm"`, Archive `ghost` `size="sm"` |
| Shadow           | none |
| Accent usage     | country line `text-muted-foreground text-xs`, errors `text-xs text-destructive` |

**Pattern notes:**
Same list chrome as menu items: `PageCard` `contentClassName="p-0"`, `ul.divide-y`, `p-6` rows. Fields are unlabeled (`aria-label` plus placeholder) like the menu item form. When the cafe sells in several countries, the country is muted helper copy (`In {label}.`), not a badge, matching the menu item form's country line. Timezone uses `SelectTrigger` `w-fit min-w-56` so IANA names such as `America/New_York` fit; other form selects stay at `min-w-40`.

### FaqCategoryNav

File: `src/modules/faq/components/faq-category-nav.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard body `bg-card` |
| Border           | none on rows; add footer `border-t` |
| Border radius    | selected row `rounded-md` |
| Text — primary   | row `text-sm`, selected `font-medium` |
| Text — secondary | count `text-muted-foreground text-xs font-normal` |
| Spacing          | list `p-3`, row `px-2 py-2`, add footer `p-6`, gap `gap-2` |
| Hover state      | row `hover:bg-muted`; selected `bg-primary/10` |
| Shadow           | none |
| Accent usage     | errors `text-xs text-destructive` |

**Pattern notes:**
Matches the menu Organize tree: compact selected row (`bg-primary/10`), count on the right. Add category is the same icon-sm Plus plus unlabeled input as the old category manager, in a `border-t p-6` footer like adding a country.

### FaqCategorySection

File: `src/modules/faq/components/faq-category-section.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard body `bg-card` |
| Border           | list `divide-y`; add footer `border-t` |
| Border radius    | none on the row |
| Text — primary   | question `text-sm font-medium` |
| Text — secondary | answer `text-muted-foreground text-sm leading-relaxed`; empty `text-muted-foreground p-6 text-sm` |
| Spacing          | FAQ row `p-6`, add footer `p-6` |
| Hover state      | Edit/Delete `ghost` `icon-sm`; Add FAQ `outline` `size="sm"` |
| Shadow           | none |
| Accent usage     | errors `text-xs text-destructive` |

**Pattern notes:**
One category per page, same chrome as a menu category: `PageCard` `contentClassName="p-0"`, header actions, `ul.divide-y` items, Add FAQ expands in the footer like Add item. General has no rename/delete.

### DashboardFaqSubnav

File: `src/modules/dashboard/components/dashboard-faq-subnav.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | active `bg-sidebar-accent` |
| Border           | rail `border-l border-sidebar-border` |
| Border radius    | row `rounded-md` |
| Text — primary   | `text-[0.9375rem] tracking-tight`, active `font-medium` |
| Text — secondary | idle `text-sidebar-foreground/70` |
| Spacing          | list `mx-3.5 px-2.5 py-0.5 gap-1`, row `h-8 px-2` |
| Hover state      | `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground` |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Uses shadcn `SidebarMenuSub` / `SidebarMenuSubButton` under FAQs, inside Base UI `Collapsible`. Sub labels match the parent nav size (`text-[0.9375rem] tracking-tight`), quieter when idle (`text-sidebar-foreground/70`), `font-medium` when selected. The FAQs row is the trigger; a `ChevronRight` with `ml-auto` rotates `group-data-[open]/collapsible:rotate-90`. Open by default on `/faqs`, closed elsewhere. General first, then the tenant's categories. Do not add icons on the sub rows.

### DashboardScopeControls

File: `src/modules/dashboard/components/dashboard-scope-pickers.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | shadcn Select |
| Border           | SelectTrigger default |
| Border radius    | SelectTrigger `rounded-md` |
| Text — primary   | `text-sm` via Select |
| Text — secondary | none (unlabeled) |
| Spacing          | header stack `gap-3 p-4` with cafe picker |
| Hover state      | Select default |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Matches `TenantPicker`: compact unlabeled `SelectTrigger` `w-48`, `aria-label` only. Country then Location, under the cafe name in `SidebarHeader`. Hidden while there is one open Country or one open Location in the current Country. Do not copy into the top bar.

### DashboardEmptyPlace

File: `src/modules/dashboard/components/dashboard-empty-place.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | Empty default |
| Border           | `border` dashed via Empty |
| Border radius    | Empty `rounded-lg` |
| Text — primary   | EmptyTitle `text-lg font-medium tracking-tight` |
| Text — secondary | EmptyDescription `text-muted-foreground text-sm/relaxed` |
| Spacing          | Empty `p-6` / `md:p-12`, header `gap-2` |
| Hover state      | none |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Hours and Profile only, when the sidebar Country has no open Locations. Use shadcn `Empty`. Menu still prices that Country.

### Toaster

File: `src/components/ui/sonner.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-background` on the toast |
| Border           | `border-border` |
| Border radius    | sonner default |
| Text — primary   | `text-foreground` |
| Text — secondary | description `text-muted-foreground` |
| Spacing          | lucide icons `h-4 w-4` |
| Shadow           | `shadow-lg` |
| Accent usage     | success/error icons from lucide; no extra color classes |

**Pattern notes:**
Mounted once in `__root.tsx`, `position="top-right"`. Action mutations toast through Query `MutationCache` (`src/lib/mutation-toast.ts`): success copy lives in `meta.successMessage`, failures use the thrown `Error` message. Skip a success toast with `successMessage: false` (drag reorders). Do not add a second toaster, and do not call `toast` from components when the mutation already has meta.
