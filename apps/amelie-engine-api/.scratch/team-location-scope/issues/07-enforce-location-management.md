# 07: Enforce on Location management

**What to build:** a bound member can update or archive only a Location they cover. Creating a Location is allowed only inside a Country the member is bound to, so a member bound only to Locations cannot create one. An unbound member can create anywhere, as today.

**Blocked by:** 05: Enforce a binding on business hours (the tracer for the guard)

**Status:** ready-for-agent

- [ ] Update and archive of an uncovered Location return 403.
- [ ] A Country-bound member can create a Location in that Country and not in another.
- [ ] A Location-only member cannot create a Location.
- [ ] Unbound members and Tenant admins are unaffected.
