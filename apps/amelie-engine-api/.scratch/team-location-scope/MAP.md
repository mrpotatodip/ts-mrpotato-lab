---
label: wayfinder:map
---
# Map: bind team members to Countries and Locations

## Destination

A decided model for binding a team member (a Party role) to Countries and Locations: who can be bound, what an unbound member can do, how a binding is stored, which Powers it limits, and what a refused request looks like. Reached when the new terms are in `GLOSSARY.md`, the hard-to-reverse parts have an ADR, and a PRD is ready for `to-spec`. No code or migration in this map.

Working answer to the seed question: a Country binding covers every Location in that Country, including ones opened later, so no Locations are listed for a Country-bound member. Specific Locations are for someone who covers part of a Country. This mirrors the FAQ rule (one Country or one Location).

## Notes

- Domain: `apps/amelie-engine-api/GLOSSARY.md` (Party role, Role, Country, Location, FAQ scope). Consult `domain-modeling` for every grilling ticket.
- Tracker is local markdown (no GitHub remote): tickets are files in `tickets/`. Frontmatter fields: `type` (research | prototype | grilling | task), `status` (open | closed), `blocked-by` (ticket filenames), `claimed-by`. Frontier = open, unclaimed, every blocker closed.
- Powers use "store" (`store_admin`, `store:hours:...`); the glossary says a Location is never a "store". Say "Location" in everything new.
- Where it lives: no new module. The superuser `admin`/`admin-role` module only gains the "can be bound" flag on a Role; bindings are cafe data owned by the `team` module (member-edit and invite forms, written by a tenant_admin); enforcement sits in the shared `requirePower` and chat assistant checks.
- Existing facts: a Party role is one per Person per Tenant (`uq_party_roles_tenant_party`), with no location column. Hours routes already take `locationId` in the query.

## Decisions so far

<!-- one line per closed ticket: [title](tickets/file.md): gist -->

- [Which routes act on a Location or Country, and how do they name it?](tickets/01-which-routes-name-a-location.md): the target is in the query (hours, profile, menu, FAQ lists), the path (Location and Country management, Country price) or the body (`locationIds[]`, FAQs); an omitted `locationId` defaults to the only Location; the chat assistant checks Powers on a separate path (`requireChatBotPower`).
- [How is a binding shaped and stored?](tickets/04-binding-shape.md): a member holds a list of bindings, each one Country (all its Locations, including later ones) or one Location, mixing allowed; one table with an exactly-one check and composite FKs; overlaps allowed; audit log, no history table.
- [Which Powers does a binding limit?](tickets/05-which-powers-are-bound.md): an explicit catalogue marker on all `store:` Powers, Location update and archive, menu item Locations, Location- or Country-scoped FAQ writes, and business profile update when it names a Location; the rest stay open; create-Location only inside a bound Country; the assistant uses the same check.
- [What can a bound-capable member do when nothing is assigned?](tickets/03-default-for-unbound-members.md): no bindings means cafe-wide, no backfill; the forms force an explicit Whole cafe / Country / Locations choice; a non-bindable Role save clears bindings; going back to Whole cafe is deliberate and audited.
- [What does a bound member get outside their binding?](tickets/06-refusal-behaviour.md): 403 for marked reads and writes at an uncovered Location; Location lists filtered; an omitted Location defaults within covered ones; multi-Location requests refused whole; threads stay open; the dashboard hides uncovered Locations.
- [Which Roles can be bound to Countries or Locations?](tickets/02-who-can-be-bound.md): a `can_be_bound` flag on the master role (on for store_admin and store_staff); off only after bindings are cleared (409); fixed off on system roles and platform scope; changes audited.
- [What happens to bindings when Locations or Countries are archived or opened?](tickets/07-archived-and-new-locations.md): bindings kept and ignored while archived; a member with only archived ones covers nothing and is never widened, with a "No active Locations" warning; the archive is not blocked but names the affected members; restoring a Country restores coverage.
- [How does the check learn the target Location, and where does it run?](tickets/08-where-the-binding-check-runs.md): a `requireBoundPower(power, locate)` guard after the validator; the `BoundPower` type makes the wrong guard a compile error; coverage loaded once per request (all, or covered open Location ids) and shared by routes, the assistant and the dashboard; the default resolves over covered Locations.
- [What do the member-edit and invite forms look like?](tickets/09-binding-forms.md): variant A, two cards (Whole cafe / Only some) with a Country-and-Locations checklist, no default, a text badge per member, a "No active Locations" warning, an archive confirmation that names affected members.

## Not yet specified

- The final write-up: glossary terms, ADR, PRD for `to-spec`. Every decision ticket is closed. The implementation slices are in `issues/` (ticket 01 there writes the glossary and ADR).

## Out of scope

- Changing what `store_admin` holds (a separate Role decision; a superuser can already make a narrower Role).
- Renaming "store" to "location" in Roles and Powers (a large change on its own; noted, not decided here).
