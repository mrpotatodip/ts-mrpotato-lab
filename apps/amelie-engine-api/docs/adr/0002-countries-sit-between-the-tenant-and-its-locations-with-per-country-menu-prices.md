# ADR-0002 — Countries sit between the Tenant and its Locations, with per-Country menu prices

- **Status:** Proposed
- **Date:** 2026-10-11
- **Module:** `tenant`, `location`, `menu`, `menu-import`, `faq`, `chat-bot`, `mcp`
- **Builds on:** ADR-0001 (Locations). Replaces its single Tenant-wide menu price and the Tenant's one Country and Currency.

## Context

A Tenant has exactly one Country and one Currency (set on the Tenant by the tenant-region work, #361-364), and every Menu item has one price in that Currency. A café with branches in two countries, say Fishkill, NY (USD) and Toronto (CAD), cannot price its menu correctly: both branches would show US dollars. Two Tenants would work, but bring back the duplicated menus, FAQs and team that Locations were meant to remove.

## Decision

**Tenant → Country → Location.** A **Country** is a real level with its own country code and Currency. Every Location belongs to exactly one Country, fixed when the Location is created (to move one, archive it and add a new one).

- A Tenant has at most one Country per country code. Adding an archived Country restores it, with its prices.
- A Country with open Locations cannot be archived, and the last open Country cannot be.
- Currency is editable with a warning. Existing prices keep their numbers and nothing is converted.
- `tenants.country` and `tenants.currency` are removed after a backfill. Sign-up creates the first Country together with the first Location, using the country and currency the owner already picks.
- A new Location's timezone starts from the last Location added in that Country, then from the Tenant's.
- A Tenant with one Country sees no new UI except a muted "Sell in another country? Add a country" link on the Profile page. The Country switcher, Country settings and the Country picker on the add-Location form appear with the second Country.

### Region

The profile Region card is for single-Country cafés. Only then can it edit the country code, because the code is otherwise the Country's identity and never changes. With two or more open Countries the server refuses `PATCH /tenants/:id/region` (409) and points to the Countries settings, where only the Currency is edited.

### Menu

Names, descriptions, categories, Dietary tags, photos and ordering stay Tenant-wide. Translations are out of scope. Only prices and where an item is sold differ.

- `menu_item_prices (tenant_id, menu_item_id, country_id, price, variants, is_sold)`: the **Country price**, in the Country's Currency, with the same "price is the lowest Variant" rule as today. Composite FKs keep an item and a Country in the same Tenant. `is_sold = false` stops selling the item there and keeps the price. Prices are entered by hand per Country.
- `tenant_menu_items.price`, `currency` and `variants` move to price rows for the Tenant's first Country, then are dropped in a second migration (a one-way door).
- An item is shown at a Location when all hold: the item is available overall; it has a Country price with `is_sold = true` in the Location's Country; and the ADR-0001 Location rules allow it (sold out here, only here). There is still no per-Location price.
- A Country's menu shows only the categories with at least one item sold there. The owner's editor shows all categories.
- A menu Import targets one Country. Its items are created once for the Tenant and priced only in that Country.

### FAQs

`tenant_faqs` gets a nullable `country_id` next to `location_id`, with a check that at most one is set. Neither means every Location. The assistant sees the Tenant-wide FAQs, the ones for its Location's Country, and the ones for its Location. The "Applies to" select lists all locations, "{Country} (all locations)" and "{Location} only".

### Passing a Country (the same way as a Location)

- **Widget:** an optional `?country=` next to `?location=`, validated against the Tenant's open Countries and stored on the Thread session when the Thread starts, immutable afterwards. With both, the Location's Country wins and a mismatch is refused. The Thread session gets a nullable `country_id`.
- **Tools:** `listMenu`, `findMenuItems`, the menu cards, the price tool and the FAQ tools take an optional `countryId` (id, code such as `CA`, or name). The Country in play is the model's override, then the Thread's Country, then the Thread's Location's Country, then the Tenant's only Country. Read tools ignore a value that matches nothing and say so. The price tool and the FAQ write tools change nothing on a bad value and return the valid choices.
- **Prices:** with several Countries and no Location or Country in play, menu answers carry names and availability but no prices, and the assistant asks which location before quoting one. This applies to MCP callers too, so they pass `locationId` or `countryId` to get prices.
- **Mid-chat:** a `setThreadCountry` tool sits beside `setThreadLocation`. A Country with exactly one open Location resolves that Location silently. With several, the assistant asks which one only when the answer needs a branch (hours, address), not for prices.
- **API and dashboard:** menu and FAQ routes take `?countryId=` like `?locationId=`. The dashboard sends it through a `withCountry` helper beside `withLocation`. A price is always saved against an explicit Country on its own route. The Menu page gets a Country switcher with 2+ Countries, showing that Country's items with its price and variants and a "sold in this country" toggle.
- **Assistant admin tools:** `update-menu-item-price` takes a Country, and with several and none named it writes nothing and asks. `add-faq` and `update-faq` take an optional scope (all, a Country or a Location, by name), defaulting to all.

### Build order

1. Schema, backfill and contracts: `tenant_countries`, `country_id` on Locations and Thread sessions, `menu_item_prices`, FAQ Country scope.
2. Reads and writes: menu reads use price rows, sign-up creates the first Country, then the old price and currency columns are dropped in a second step.
3. Country management API and dashboard: Countries settings, the Country picker on add-Location, the Menu Country switcher, price editing, the import target, `withCountry`.
4. Assistant, widget and MCP: `?country=` on the public chat page, `countryId` on tools, `setThreadCountry`, FAQ Country scope, the price rule.

A single-Country café behaves as today until slice 3.

## Consequences

- A café can sell in several countries with correct currencies, one menu, one team and one set of FAQs.
- Every menu price read must go through the shared check that resolves a Country price, as `menuItemShownAt` does for availability, never an inline filter.
- Prices are hand-entered per Country. There is no conversion and no per-Location price. Reopen this if a real café charges different prices per branch.
- The second migration step drops price and currency columns: rolling it back needs a database restore, so it runs only after the new code is deployed. Deploy order: apply 0025 and deploy the new code back to back, to keep the window short in which old code writes only the old columns; apply 0026 only after. Before dropping, 0026 refreshes a backfilled price row or Country from the old columns only if nothing wrote it since the backfill (`updated_at = created_at`), so edits old code made in that window survive and edits new code made are never overwritten. Every write the new code makes to those rows must therefore bump `updated_at`.
- MCP callers lose prices on a multi-Country café unless they pass a Location or Country. Single-Country cafés are unaffected.
- Out of scope: translated names or descriptions, currency conversion, per-Location prices, per-Country permissions.
- Alternatives rejected: Country and Currency repeated on each Location (two US Locations can disagree, and Country-wide rules have no home); one base price converted automatically (rates and rounding the owner doesn't control); one Tenant per country (duplicated menus, FAQs and team).
