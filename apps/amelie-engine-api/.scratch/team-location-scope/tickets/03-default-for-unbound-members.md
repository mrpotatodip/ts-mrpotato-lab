---
type: grilling
status: closed
blocked-by: []
claimed-by: claude
---
# What can a bound-capable member do when nothing is assigned?

## Question

Cafe-wide (today's behaviour, no backfill) or no access until assigned. Recommended: cafe-wide, with the forms making that state explicit.

## Resolution

- A member with no bindings is cafe-wide, as every member is today. No backfill or migration is needed; bindings only narrow access.
- "Forgot to assign" is prevented in the forms, not in storage. Inviting someone to a bindable Role, or changing a member to one, requires an explicit choice: Whole cafe, a Country, or specific Locations, with no default. "Whole cafe" is stored as no bindings. The member list shows "Whole cafe" or the bound names on every row.
- Saving a member to a Role that cannot be bound clears their bindings, so no stale binding stays hidden. Moving them back to a bindable Role asks again.
- Ending with no bindings is possible only by choosing "Whole cafe". It is a deliberate change, recorded in the audit log with the before and after set and the actor. No extra confirmation step.
