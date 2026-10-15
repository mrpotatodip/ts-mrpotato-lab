# Dashboard Country and Location pick

Status: ready-for-agent. Grilled and agreed 2026-10-15.

## Problem Statement

Cafe Amelie is Tenant → Country → Location. Menu prices a Country. Hours and Profile edit a Location. Those picks lived on the page, in React state, and reset when you moved. The sidebar only switched cafe. A Person with two countries or two places had no shared place to say which one they were working in.

## Solution

One shared Country and Location pick under the cafe name in the dashboard sidebar. Menu, Hours, and Profile read it. Import copies it once onto the publish card. Nothing else does.

## User Stories

1. As an owner, I want to pick a Country next to the cafe name when I sell in more than one, so Menu prices stay in that Country as I move around the dashboard.
2. As an owner, I want to pick a Location next to the cafe name when this Country has more than one open place, so Hours and Profile stay on that place.
3. As staff, I want to change the same pick, so I can view Toronto hours and CAD prices without edit permission.
4. As an owner, I want the Location list to only show places in the selected Country, so I cannot mix Canada prices with US hours.
5. As an owner, I want picking a Location to set its Country, so the two never disagree.
6. As an owner, I want the pickers hidden when there is only one Country or only one open Location in this Country, so a single-place cafe looks as it does today.
7. As an owner, I want the pick remembered in this tab for this cafe, so a refresh keeps Canada selected.
8. As an owner, I want switching cafe to reset the pick, so another Tenant does not inherit Toronto.
9. As an owner, I want a stale stored id to fall back to the oldest open Country, then the oldest open Location in that Country, so archived places do not stick.
10. As an owner, I want Menu to lose its in-page Country switcher, so there is one place to change Country.
11. As an owner, I want Hours and Profile to lose their in-page Location switchers, so there is one place to change Location.
12. As an owner, I want Hours and Profile to still name a Location when the cafe has several places even if this Country has only one, so the engine does not answer "needs location".
13. As an owner, I want to pick a Country with no open Locations so I can still edit its prices.
14. As an owner, I want Hours and Profile to show that this Country has no open locations instead of another Country's hours or address.
15. As an owner, I want Import's publish destinations to start from the sidebar pick, then stay put if I change the sidebar.
16. As an owner, I do not want FAQs, Overview, Widget, Chats, or the floating assistant to filter by this pick.

## Implementation Decisions

- Country is the outer filter. Stored Country is resolved first. Location must belong to it or becomes the oldest open Location there.
- `countryId` sent to the engine is omitted when the cafe has one open Country. `locationId` is omitted when the cafe has one open Location, unless the selected Country has none (then Hours and Profile do not fetch).
- Persist `{ countryId, locationId }` in `sessionStorage`, keyed by Tenant id. Same-tab updates via a small store. SSR first paint may be the default, then snap. No cookie. No URL.
- Chrome matches the cafe picker: compact unlabeled selects, `w-48`, `aria-label` only. Order: cafe, Country, Location. Drawer only; not copied into the top bar.
- Menu, Hours, and Profile read the shared hook. Import keeps CountrySwitcher and LocationSwitcher with their publish labels, seeded once from the shared pick. Import lists stay unfiltered.
- Resolve lives in a dashboard helper so Menu/Hours/Profile can import it without a module cycle through dashboard loaders.

## Testing Decisions

- Seam: `resolveDashboardScope(countries, locations, stored)` for coupling, fallback, API ids, and empty place.
- Seam: sidebar controls render Country and Location comboboxes only when those lists have two or more.
- Existing Menu / Hours / Profile / Import tests stay at the panel if they already cover switchers; update them to the new source of the pick rather than adding duplicate cases.

## Out of Scope

- FAQs, Overview, Widget, Chats, dashboard assistant thread Country/Location.
- Prefetch reading `sessionStorage`.
- Per-Country permissions, translated names, per-Location prices.

## Further Notes

Glossary: the Menu Country switcher is the dashboard sidebar pick, not a control on the Menu page.
