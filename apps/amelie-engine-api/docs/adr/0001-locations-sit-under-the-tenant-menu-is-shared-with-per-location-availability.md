# ADR-0001 — Locations sit under the Tenant; the menu is shared with per-Location availability

- **Status:** Accepted
- **Date:** 2026-10-10
- **Module:** `tenant`, `schedule`, `menu`, `faq`, `chat-bot`, `mcp`

## Context

A Tenant has one address, one set of Business hours, one timezone and one menu. A café with two branches (Downtown, Airport) cannot be described: hours, contact details and stock differ per branch. Modelling each branch as its own Tenant works today (a Person may hold Party roles in several Tenants) but forces the owner to maintain every menu item, FAQ and team member twice.

## Decision

**Tenant stays the brand and account.** A **Location** is a new entity under it, one per physical place.

- Every Tenant has at least one Location. Sign-up and the migration create a default one, so code always has a `location_id`. Single-Location Tenants see no Locations UI.
- Locations are archived, never deleted. The last active Location cannot be archived.
- `name` is required, `slug` is unique per Tenant, `address` is free text.

**Per Location:** address, phone, timezone, Business hours, Hours overrides. `tenants.timezone` becomes the default for new Locations. "Open now" and "Next 7 days" use the Location's timezone.

**Tenant-wide:** description, website, email, Dietary tags, Roles. Roles are not scoped to a Location.

**FAQs** are Tenant-wide by default. A nullable `location_id` on `tenant_faqs` makes one branch-specific (null means all Locations).

### Menu

Categories and items stay Tenant-wide and are edited once. Where an item is sold is described by one flag and one table.

- `tenant_menu_items.available_at_all_locations` (boolean, default true).
- `tenant_menu_item_locations (tenant_id, menu_item_id, location_id, is_available)`, with composite FKs so a row can only join an item and a Location of the same Tenant.
- `tenant_menu_items.is_available` keeps its meaning: off the menu everywhere.

An item is shown at a Location when all of these hold:

| `is_available` (item) | `available_at_all_locations` | row for the Location | shown? |
|---|---|---|---|
| false | any | any | no |
| true | true | none | yes |
| true | true | `is_available = false` | no (sold out here) |
| true | false | none | no (not sold here) |
| true | false | `is_available = true` | yes (sold only at chosen Locations) |

Example (Sorella: Downtown + Airport):

- **Sold out at one branch:** Iced Latte has `available_at_all_locations = true`. Downtown marks it sold out, which adds one row `(Iced Latte, Downtown, false)`. Airport has no row, so it still sells it.
- **Item only one branch sells:** Airport Sandwich has `available_at_all_locations = false` and one row `(Airport Sandwich, Airport, true)`. Downtown has no row, so the bot never offers it there. A Location opened later does not inherit it.
- **Dropped item:** Pumpkin Soup has `is_available = false`. It is hidden everywhere.

Menu Imports stay Tenant-level. Published items default to `available_at_all_locations = true`. Hours drafts ask for a target Location at publish time (the default Location when there is only one).

### Chat

- The widget embed carries an optional location. The server validates it against the Tenant and stores it on the Thread session. It is fixed at Thread start and never comes from later browser messages.
- With no Location on a multi-Location Tenant, the assistant asks "which location?" only when the answer depends on it, stores the pick, and switches if the customer names another branch.
- The tools (`getOpeningSchedule`, `getBusinessProfile`, `listMenu`, `findMenuItems`, `listFaqs`) take an optional `locationId`. Omitted, it resolves server-side from the Thread. With several Locations and none set, the tool returns "needs location" plus the options. With one Location it is used silently.

### Migration

Two steps (expand, then contract). The first creates a default Location per Tenant named after the Tenant, copies address and phone from the Business profile and timezone from the Tenant, and backfills `location_id` on hours and overrides. Business hours become unique on `(location_id, day_of_week)`. The old columns are dropped in a later migration.

## Consequences

- Owners edit the menu once; a rename or price change reaches every branch.
- Sold-out is a per-Location switch, so a shortage at one branch never hides the item at another.
- "Only sold here" items need no second menu, but the flag adds a rule every menu read must apply. Menu reads go through one shared availability predicate (`menuItemShownAt` in the menu module's queries), never an inline filter. A read with no Location (the cafe-wide dashboard list, or a chat with several Locations and none chosen) applies no availability rows and hides nothing for Location reasons.
- No per-Location permissions: a manager of one branch can edit another's hours. Reopen this if a real café needs it.
- No per-Location price override yet. Reopen if a real café charges different prices per branch.
- Alternatives rejected: one Tenant per branch (duplicated menus, FAQs and team; Threads and invite codes split); fully separate menus per Location (every change made once per branch, branches drift apart).

## Build order

1. Schema, migration, contracts, default Location, glossary, this ADR (no behaviour change).
2. API and tools resolve the Location; hours per Location.
3. Thread Location, widget param, the assistant's "which location?" question.
4. Dashboard Locations UI and switcher (hidden until a Tenant has two Locations).
5. Per-Location menu availability and FAQs.
