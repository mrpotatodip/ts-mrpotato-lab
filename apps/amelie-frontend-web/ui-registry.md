# UI registry

Last updated: 2026-10-15

### Skeleton loaders

File: `src/components/ui/skeleton.tsx`, `src/modules/*/components/*-skeleton.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-muted` with `animate-pulse` |
| Border           | none on bones; PageCard chrome matches the loaded screen |
| Border radius    | `rounded-md` bones; `rounded-lg` thumbs; `rounded-full` badges and checklist dots |
| Text — primary   | `h-4` title bones |
| Text — secondary | `h-3` / `h-4` subtitle bones |
| Spacing          | same as the loaded rows: list `px-6 py-5`, fields `gap-3`, form labels `gap-1.5` |
| Hover state      | none |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
A skeleton copies the loaded layout, not a single `h-* w-full` block. Cards keep their real titles. List rows keep title + subtitle + badge/actions. Forms keep input-height bones (`h-10`) and textarea-height bones. Chat uses Bubble/Message chrome with `bg-foreground/15` bones inside the bubble.

### MenuImportList

File: `src/modules/menu-import/components/menu-import-suspense-list-main.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard `bg-muted/60` header, body `bg-card` |
| Border           | PageCard `border` plus `border-t` on the body |
| Border radius    | `rounded-3xl` |
| Text — primary   | row title `text-sm font-medium` |
| Text — secondary | `stat-label` |
| Spacing          | page grid `gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16`, rows `DASHBOARD_ROW_LINK_CLASS` (`px-6 py-5`) |
| Hover state      | `hover:bg-accent/40 transition-colors` |
| Shadow           | PageCard `shadow-none` |
| Accent usage     | `DashboardStatusBadge` (`info` reading, `warning` review, `danger` failed, `success` published, `neutral` reviewed) |

**Pattern notes:**
Same list-in-card as Overview / Unanswered / Chats. Empty copy stays a `p-6 text-sm` sentence inside the card. Upload is a PageCard with the native file input. Status is `.status-badge`, not `Badge`.

### MenuImportDraft

File: `src/modules/menu-import/components/menu-import-draft.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | list row on PageCard body |
| Border           | `divide-y` on the list |
| Border radius    | none on the row |
| Text — primary   | `text-sm font-medium`; discarded also `text-muted-foreground line-through` |
| Text — secondary | `text-muted-foreground text-sm leading-relaxed` |
| Spacing          | row `flex flex-col gap-2 px-6 py-5`, actions `gap-1` |
| Hover state      | none on the row (icon buttons use ghost) |
| Shadow           | none |
| Accent usage     | `DashboardStatusBadge` success Approved, warning Needs a look, neutral Discarded |

**Pattern notes:**
Each kind is its own PageCard (`contentClassName="p-0"`), like FAQ categories. Edit replaces the row with the form, no nested Card.

### CustomerThreadSheet

File: `src/modules/customer-thread/components/customer-thread-sheet.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-card` |
| Border           | `border` |
| Border radius    | `rounded-3xl` |
| Text — primary   | SheetTitle `text-lg font-semibold` |
| Text — secondary | SheetDescription `text-sm text-muted-foreground` |
| Spacing          | inset `inset-y-4` `left-4`/`right-4`, header `shrink-0`, body `mt-6 min-h-0 flex-1 overflow-y-auto` |
| Hover state      | header icons ghost `icon-sm` `opacity-70 hover:opacity-100`; move-side `sheet-move-wiggle-left` / `sheet-move-wiggle-right` |
| Shadow           | none (sheet default) |
| Accent usage     | none |

**Pattern notes:**
Same floating panel as `ChatBotSheet`: `modal={false}` `disablePointerDismissal` `overlay={false}`, hide default close, swap side with PanelLeft/PanelRight. Width is `sm:max-w-xl` (wider than the assistant). Used from Chats and Unanswered. No overlay dim. Messages scroll inside the panel; the page stays usable. Move-side button uses `sheet-move-wiggle-left` / `sheet-move-wiggle-right` so the icon wiggles toward the destination on hover. After a side swap, the panel plays `animate-sheet-wiggle-left` / `animate-sheet-wiggle-right`: one small overshoot and settle (0.55s). Skip with `motion-reduce:animate-none`.

### ChatBotSheet

File: `src/modules/chat-bot/components/chat-bot-sheet.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-card` |
| Border           | `border` |
| Border radius    | `rounded-3xl` |
| Text — primary   | SheetTitle is the Bot icon plus `sr-only` Assistant |
| Text — secondary | SheetDescription `text-sm text-muted-foreground` |
| Spacing          | inset `inset-y-4` `left-4`/`right-4`, header `shrink-0`, body `mt-6 min-h-0 flex-1` |
| Hover state      | header icons ghost `icon-sm` `opacity-70 hover:opacity-100`; move-side `sheet-move-wiggle-left` / `sheet-move-wiggle-right`; launcher Bot `assistant-bot-excited` |
| Shadow           | panel `shadow-xs`; launcher `shadow-lg` |
| Accent usage     | none |

**Pattern notes:**
Owner assistant floating panel. `modal={false}` `disablePointerDismissal` `overlay={false}`, `w-[calc(100%-2rem)] sm:max-w-lg`, `shadow-xs` so the lift is quieter than the default `shadow-lg`, hide default close, swap side with PanelLeft/PanelRight. Narrower than `CustomerThreadSheet` so more of the dashboard stays visible. Launcher is a fixed round Bot button bottom-right; minimized keeps the same round button plus a `bg-status-info` dot (no Assistant label). The panel title is the Bot icon. TanStack Hotkeys in `ChatBotSheet`: `Mod+.` shows the panel or minimizes it, `Escape` closes (panel visible only). After hydrate, the panel title shows `Kbd` for `Mod+.` from `formatForDisplay`. Chrome already uses `Mod+J` for Downloads, so this is not J. On hover the Bot icon plays `assistant-bot-excited` (squash, hop, little tilt, loops while hovered, only on `@media (hover: hover)`). Move-side button uses `sheet-move-wiggle-left` / `sheet-move-wiggle-right` so the icon wiggles toward the destination on hover. After a side swap, the panel plays `animate-sheet-wiggle-left` / `animate-sheet-wiggle-right`: one small overshoot and settle (0.55s). Skip with `motion-reduce:animate-none`.

### Button

File: `src/components/ui/button.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | primary `bg-primary`; outline `bg-transparent`; ghost none |
| Border           | outline `border border-input`; others none |
| Border radius    | `rounded-md` |
| Text — primary   | `text-sm font-medium`; primary `text-primary-foreground` |
| Spacing          | size default `h-10 px-4 py-2`; sm `h-9 px-3`; lg `h-11 px-8`. Primary (`variant` default) extra x-padding: `px-8` / `px-6` / `px-12` |
| Hover state      | primary `hover:bg-primary/90` |
| Shadow           | none |
| Accent usage     | `bg-primary` |

**Pattern notes:**
Primary actions use `variant="default"` (omitted). Extra horizontal padding is compound-variant only so outline, ghost, and secondary stay on the size tokens. Icon sizes stay square.

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
Opens from a ghost `icon-sm` Image control next to Delete on the item row. Sheet chrome is the inset card (`inset-y-4 right-4`, `rounded-3xl`) with overlay `bg-black/10`. Chat/unanswered use `CustomerThreadSheet` instead (no overlay, same floating card as the assistant). Sheet thumbs are `size-24 rounded-lg object-cover`. Each photo row uses ghost `icon-sm` up/down arrows, then Cover (`outline` `sm`), then delete. Add photos is `Button variant="outline" size="sm"`. Cap is `MENU_ITEM_IMAGE_MAX`. First photo is Cover. The item row shows that cover left of the title (`size-10 rounded-lg`) with a primary count bubble (`Badge`, `min-w-5`, `text-[10px]`, `-top-1.5 -right-1.5`). The thumb is omitted when the item has no photo.

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
Matches menu/FAQ/country add forms: no visible labels, `aria-label` plus placeholder, name `w-56`, `SelectTrigger` `w-fit min-w-40`. Add starts as outline `size="sm"` in a `border-t p-6` footer, then expands to this form with Cancel. One open Location still shows its row so name, timezone, address and phone can be saved. On Profile the Country is already picked, so the Country select is omitted and the new Location lands in that Country.

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
| Border           | rail `border-l border-sidebar-foreground/25`, ticks `before:bg-sidebar-foreground/25` |
| Border radius    | row `rounded-md` |
| Text — primary   | `text-[0.9375rem] tracking-tight`, active `font-medium` |
| Text — secondary | idle `text-sidebar-foreground/70` |
| Spacing          | list `mx-3.5 px-2.5 py-0.5 gap-1`, row `h-8 px-2` |
| Hover state      | `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground` |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Uses shadcn `SidebarMenuSub` / `SidebarMenuSubButton` under FAQs, inside Base UI `Collapsible`. Sub labels match the parent nav size (`text-[0.9375rem] tracking-tight`), quieter when idle (`text-sidebar-foreground/70`), `font-medium` when selected. The FAQs row is the trigger (`FileText`, same icon as the overview FAQ stat); a `ChevronRight` with `ml-auto` rotates `group-data-[open]/collapsible:rotate-90`. Open by default on `/faqs`, closed elsewhere. General first, then the tenant's categories. Do not add icons on FAQ sub rows. Menu uses the same chrome (`dashboard-menu-subnav.tsx`) with icons. Tree rail and ticks live on `SidebarMenuSub` / `SidebarMenuSubItem` so every subnav gets them. Do not use `Brain` here; that reads as the assistant.

### DashboardMenuSubnav

File: `src/modules/dashboard/components/dashboard-menu-subnav.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | active `bg-sidebar-accent` |
| Border           | rail `border-l border-sidebar-foreground/25`, ticks `before:bg-sidebar-foreground/25` |
| Border radius    | row `rounded-md` |
| Text — primary   | `text-[0.9375rem] tracking-tight`, active `font-medium` |
| Text — secondary | idle `text-sidebar-foreground/70` |
| Spacing          | list `mx-3.5 px-2.5 py-0.5 gap-1`, row `h-8 px-2` |
| Hover state      | `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground` |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Same collapsible chrome as DashboardFaqSubnav, but sub rows have Lucide icons (`LayoutList` Items, `FileUp` Import) at the SidebarMenuSubButton default `[&>svg]:size-4`. Parent is not a link. Tree rail and ticks come from `SidebarMenuSub` / `SidebarMenuSubItem`.

### DashboardScopeControls

File: `src/modules/dashboard/components/dashboard-scope-pickers.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | shadcn Select |
| Border           | SelectTrigger default |
| Border radius    | SelectTrigger `rounded-md` |
| Text — primary   | Location name, `text-sm` via Select |
| Text — secondary | Country line `text-muted-foreground text-xs font-normal` |
| Spacing          | header stack `gap-3 p-4` with cafe picker; trigger `h-auto w-full py-2` |
| Hover state      | Select default |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
One unlabeled `SelectTrigger` `w-full` under the cafe picker, `aria-label` only. Place name on the first line; Country on the second when the cafe sells in more than one. Menu groups places under `SelectLabel` Country names; a Country with no open Location is a leaf. Hidden while there is one open Country and one open Location. Matches `TenantPicker` width (`w-full`). Do not copy into the top bar.

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

### DashboardAccountMenu

File: `src/modules/dashboard/components/dashboard-account-menu.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | SidebarFooter, open state `data-popup-open:bg-sidebar-accent` |
| Border           | menu `border` `rounded-md` |
| Border radius    | trigger `rounded-md`; avatar `rounded-full` |
| Text — primary   | name `text-sm font-medium` |
| Text — secondary | subtitle `text-muted-foreground text-xs`; plan/role rows `text-xs` |
| Spacing          | footer `p-2`; trigger `size="lg"`; menu `min-w-56` `sideOffset={8}` |
| Hover state      | SidebarMenuButton hover `bg-sidebar-accent` |
| Shadow           | menu `shadow-md` |
| Accent usage     | avatar fallback `bg-sidebar-accent` |

**Pattern notes:**
Replaces the old name + outline Log out stack. Trigger is initials, name, `Owner · Free plan` (or Superuser with no cafe). Menu lists email, Role, Plan (`Free` until billing), then Log out. Opens `side="top"`. Keep `LogoutButton` on `/no-cafe` only. Dropdown menus snap shut: no exit fade or scale.

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

### WidgetInstallCard

File: `src/modules/widget/components/widget-install-card.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard (`bg-muted/60`, body `rounded-3xl border-t bg-card`) |
| Border           | PageCard; guide `border-t` |
| Border radius    | PageCard |
| Text — primary   | title via PageCard `text-lg`; guide heading `text-sm font-medium`; snippet `font-mono text-sm` |
| Text — secondary | description via PageCard; guide body `text-sm text-muted-foreground`; attr names `code` `text-foreground` |
| Spacing          | snippet then link `mt-4`; guide `mt-6` `pt-6` `space-y-3`; examples `space-y-4` / `space-y-2`; page stack `space-y-8` |
| Hover state      | outline `sm` Copy; Try chat Link with `buttonVariants` `link` `sm` `px-0` |
| Shadow           | none |
| Accent usage     | snippet `bg-muted rounded-md px-3 py-2` |

**Pattern notes:**
Copyable install snippet on Widget. Snippet chrome matches invite-code mono: `font-mono` on `bg-muted rounded-md px-3 py-2`. One Location pins `data-location` and `data-country` on that snippet. Several Locations keep the copy slug-only and list a tag per branch under Country and location. Link to `/chat/$slug` uses the link button classes so it stays an `<a>`, not `role="button"`.

### WidgetCustomerChatCard

File: `src/modules/widget/components/widget-customer-chat-card.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | PageCard (`bg-muted/60`, body `rounded-3xl border-t bg-card`) |
| Border           | PageCard |
| Border radius    | PageCard |
| Text — primary   | title via PageCard `text-lg`; field label `text-sm` |
| Text — secondary | description via PageCard; hex line `text-muted-foreground`; errors `text-xs text-destructive` |
| Spacing          | fields `flex flex-col gap-3`, label/input `gap-1.5`, colour row `gap-2`, Save `mt-3`, error `mt-4` |
| Hover state      | colour Input `h-10 w-14 p-1`; outline `sm` Use default; default `sm` Save |
| Shadow           | none |
| Accent usage     | empty swatch is `--primary` as hex (`toAccentSwatchValue`) |

**Pattern notes:**
Sits between the install snippet and Allowed origins on Widget. Editors set an accessible button label and a `#rrggbb` colour. The label is not drawn on the bubble or in the iframe. Fields wrap like Profile (`flex flex-col gap-1.5 text-sm`). Empty colour is Amelie's `--primary`; the native colour input shows that swatch, not a raw near-black. Staff see the stored text and hex with no Save.

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

### PublicChatRoom

File: `src/modules/chat-bot/components/public-chat-room.tsx`
Last updated: 2026-10-15

| Property         | Class |
| ---------------- | ----- |
| Background       | page default |
| Border           | none |
| Border radius    | none on the header |
| Text — primary   | none; cafe label is not shown in the iframe |
| Text — secondary | none |
| Spacing          | header `p-4`, icon aligned `justify-end` |
| Hover state      | ghost `icon-sm` |
| Shadow           | none |
| Accent usage     | `--primary` / `--ring` from `customerChatAccent` |

**Pattern notes:**
Customer iframe header is icon-only. New chat is ghost `icon-sm` `MessageSquarePlus` with `aria-label` and `title` "New chat". The cafe name is not shown in the iframe or on the host bubble.
