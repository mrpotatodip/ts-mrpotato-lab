---
type: grilling
status: closed
blocked-by: [04-binding-shape.md]
claimed-by: claude
---
# What happens to bindings when Locations or Countries are archived or opened?

## Question

Assignments to an archived Location: keep, remove, or block the archive? A member left with only archived Locations: warn, or fall back to cafe-wide? New Location in a bound Country: covered automatically (assumed).

## Resolution

- A new Location in a bound Country is covered automatically (ticket 4). A Location-only binding never covers a Location opened later.
- Archiving a Location keeps the binding row. Access checks ignore archived Locations.
- A member left with only archived Locations (or only archived Countries) covers nothing: every marked Power is refused with 403. They are never widened to cafe-wide. A member with no bindings at all is still cafe-wide (ticket 3); the member list keeps the two states apart and shows "No active Locations" as a warning for the first.
- The archive is not blocked. Its confirmation says how many members will be left with no active Location and names them.
- A Country binding to an archived Country covers nothing, and is kept. Restoring the Country makes its bindings cover its Locations again, with no re-assigning.
