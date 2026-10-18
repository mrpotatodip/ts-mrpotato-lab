# 05: Enforce a binding on business hours (the tracer for the guard)

**What to build:** a bound member cannot read or change hours at a Location they do not cover. Add an explicit "bound" marker to the Powers in the catalogue, a type derived from it, and a route guard that runs after the request is parsed and compares the Locations the request names with the member's coverage. Plain `requirePower` keeps working for unbound Powers and rejects bound ones at compile time; the new guard does the reverse. The usage map records which routes use which guard. Hours reads, weekly hours and overrides get the guard. An omitted Location resolves to the only covered Location, or answers "needs location" listing only covered ones. Refusals are 403 with "Your Role does not cover this Location", and nothing is written. Source: tickets 01, 05, 06 and 08 in `tickets/`.

**Blocked by:** 03: Bind a team member to Countries or Locations

**Status:** done

- [ ] Every `store` Power carries the marker; using `requirePower` on one, or the new guard on an unmarked one, fails to compile.
- [ ] A member bound to Airport can edit Airport hours and gets 403 for Downtown, for reads and writes.
- [ ] An unbound member and a Tenant admin behave exactly as before.
- [ ] A member covering one Location can omit the Location; covering several and omitting it gets "needs location" with only their options.
- [ ] The usage-map test fails when a route's guard does not match its Power.
