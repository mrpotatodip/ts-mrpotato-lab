# 06: Enforce on availability and menu item Locations

**What to build:** location availability (sold out, per Location) and menu item Locations respect bindings. These requests name several Locations in the body, so the whole request is refused with 403 if any named Location is uncovered. Nothing is written, and the message names the uncovered Locations.

**Blocked by:** 05: Enforce a binding on business hours (the tracer for the guard)

**Status:** done

- [x] A bound member can mark an item sold out only at Locations they cover.
- [x] A request naming one covered and one uncovered Location is refused whole, with nothing changed, and the message names the uncovered one.
- [x] Setting an item's chosen Locations is limited the same way.
- [x] Unbound members and Tenant admins are unaffected.

## Notes

- `store:menu:availability:read` has no route yet (it is bound in the catalogue, so a future route must use `requireBoundPower`).
- `company:menu:locations:update` is now bound. A body with `availableAtAllLocations: true` names every Location, so it is refused (403, "Your Role does not cover every Location") unless the member's coverage is "all". This is an assumption: the listed `locationIds` are only the sold-out ones in that case, but the write replaces the item's whole Location state.
- `requireBoundPower` now always names the uncovered ids in the 403 message, including for a single Location. An empty coverage still gets the plain message.
- The sold-out route (`availableAtAllLocations: true` with sold-out ids) is guarded on the named ids only, as specified. Its replace semantics mean a bound member's write also clears sold-out rows at uncovered Locations by omission; not addressed here.
- No menu screen reads coverage today, so no frontend change.
