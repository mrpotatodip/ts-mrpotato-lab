# 06: Enforce on availability and menu item Locations

**What to build:** location availability (sold out, per Location) and menu item Locations respect bindings. These requests name several Locations in the body, so the whole request is refused with 403 if any named Location is uncovered. Nothing is written, and the message names the uncovered Locations.

**Blocked by:** 05: Enforce a binding on business hours (the tracer for the guard)

**Status:** ready-for-agent

- [ ] A bound member can mark an item sold out only at Locations they cover.
- [ ] A request naming one covered and one uncovered Location is refused whole, with nothing changed, and the message names the uncovered one.
- [ ] Setting an item's chosen Locations is limited the same way.
- [ ] Unbound members and Tenant admins are unaffected.
