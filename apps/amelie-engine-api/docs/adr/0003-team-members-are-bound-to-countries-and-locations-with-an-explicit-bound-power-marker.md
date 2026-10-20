# ADR-0003 — Team members can be bound to Countries and Locations, through an explicit Bound Power marker

- **Status:** Accepted
- **Date:** 2026-10-18
- **Module:** `team`, `admin-role`, `access`, `tenant`, `location`, `schedule`, `faq`, `chat-bot`
- **Builds on:** ADR-0001 (Locations), ADR-0002 (Countries). Replaces ADR-0001's "No per-Location permissions" line.

## Context

ADR-0001 left Roles unscoped: a manager of one branch could edit another's hours. A café with branches in several Countries needs a Person who runs only the Toronto branch. A Party role has one Role per Tenant and no Location, and the Power catalogue says what a Role may do but not where. Three choices here are costly to undo later and look odd without the reasoning: how a Power is known to be location-limited, what "no Bindings" means, and what a member with only archived Locations gets.

## Decision

A team member holds a list of Bindings, each naming one Country or one Location (see the glossary). Which Roles can carry them is a flag on the Master Role, off for tenant_admin and the platform Role.

1. **Bound Powers are marked in the catalogue, and have their own guard.** The Power catalogue flags each Bound Power explicitly, and that flag produces a type. Routes for a Bound Power use a guard that also takes the Location the request names; routes for any other Power use the plain one. The wrong guard for a Power is a compile error, and the usage-map test records which routes use which, so a reviewer sees in one place that a Power is bound. The chat assistant's admin tools apply the same split and the same coverage value, so it cannot bypass a Binding.
2. **No Bindings means whole cafe.** Bindings only narrow access, so existing members keep working with no backfill. "Forgot to assign" is prevented in the invite and member-edit forms, which require an explicit Whole cafe, Country or Locations choice with no default. Going back to Whole cafe is deliberate and audited.
3. **Archived coverage never widens.** A member whose Bindings reach only archived Locations or Countries covers nothing and is refused on every Bound Power. They are not promoted to whole-cafe. Archiving is not blocked; its confirmation names the members left with nothing, and restoring a Country restores coverage.

## Considered options

- **Infer Bound Powers from the name** (every `store:` Power). Rejected: the `store:` prefix is a legacy name, not a rule. It misses Powers that act on a Location (Location update and archive, menu item Locations, Location- or Country-scoped FAQ writes) and would silently bind any future Power that happens to carry the prefix, or leave a new Location Power open by forgetting it. A marker makes the set explicit and reviewable.
- **Check in each service.** Rejected: dozens of call sites, each able to forget, and the chat assistant's separate path would drift from the routes. One guard after request parsing, fed by one per-request coverage value, is the single place to look.
- **No access until assigned** (absence means nothing). Rejected: it would lock out every current member on release and force a backfill that guesses at who should reach what. Cafe-wide-by-absence is today's behaviour, and the forms remove the accident risk instead.
- **Fall back to whole-cafe when all Locations are archived.** Rejected: archiving a branch would quietly grant its staff the whole cafe. Refusing, with a "No active Locations" warning on the member list, fails safe.

## Consequences

- A request at an uncovered Location is a 403 for marked reads and writes; Location lists are filtered to covered ones; a request that names several Locations is refused whole.
- Cafe-wide Powers stay open to a bound member as their Role grants them: Team, master menu items, categories, images and import, Country management and prices, the widget and the assistant. A Location-only member cannot create a Location; creating one needs a Binding to its Country.
- A Country Binding and a Location Binding inside it may coexist; the form folds the redundant one away.
- Reopen if a real café needs a Role that is narrower than its Binding allows, or a hierarchy above Country.
