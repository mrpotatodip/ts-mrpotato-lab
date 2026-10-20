---
type: prototype
status: closed
blocked-by: []
claimed-by: claude
---
# What do the member-edit and invite forms look like for choosing Whole cafe, a Country, or Locations?

## Question

Rough UI to react to: the explicit Whole cafe / Country / Locations choice with no default, a member list row that shows Whole cafe or the bound names, the 'No active Locations' warning, the archive confirmation that names affected members, and the Role page flag toggle with its 409 message. Follow DESIGN.md.

## Resolution

Verdict: **variant A, "Radio choice"**.

- Choosing where a Role applies is two cards, "Whole cafe" and "Only some". "Only some" shows a checklist: an "All of <Country> (includes new Locations)" row above each Country's Locations. A Country tick disables and ticks its Locations.
- No default. The Invite button and Save stay disabled until a choice is made. A Role that is never limited hides the picker and says its Locations are cleared on save.
- On the member list, access is one text badge: "Whole cafe", or the names ("All of Canada, Seattle"). A Role that is never limited reads "Whole cafe (this Role is never limited)".
- A member with only archived Locations or Countries shows the warning "No active Locations: every limited action is refused until you reassign."
- The Location archive confirmation names the members left with no active Location and does not block the archive.
- The Role page flag shows "Cannot turn this off: N members still have bindings. Clear them first." on the 409.
- Prototype code (throwaway, not for production): `modules/team/prototype/` plus a `?variant=` hook in `routes/_dashboard/team.tsx`. It was not committed; its capture on a throwaway branch is pending the user's go-ahead.
