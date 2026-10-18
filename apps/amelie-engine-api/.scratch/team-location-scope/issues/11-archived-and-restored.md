# 11: Archived and restored Locations and Countries

**What to build:** bindings survive archiving and never widen. Archiving a Location or Country keeps the bindings, and access checks ignore archived ones. A member left with only archived Locations or Countries covers nothing and is refused every bound action; they are not made cafe-wide, and the member list shows "No active Locations: every limited action is refused until you reassign." Archiving a Location is not blocked, but its confirmation names the members who will be left with no active Location. Restoring a Country makes its bindings cover its Locations again with no re-assigning.

**Blocked by:** 04: Dashboard shows a bound member only their Locations

**Status:** ready-for-agent

- [ ] Archiving Airport keeps Priya's binding; she can no longer act at Airport.
- [ ] A member whose only binding is archived is refused, not widened, and the list shows the warning.
- [ ] The archive confirmation lists the affected members by name and email.
- [ ] Restoring an archived Country restores coverage for its bound members.
- [ ] A member with no bindings at all is still cafe-wide, and the list shows them differently from the warning case.
