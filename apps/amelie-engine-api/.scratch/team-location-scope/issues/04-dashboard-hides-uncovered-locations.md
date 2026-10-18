# 04: Dashboard shows a bound member only their Locations

**What to build:** when a bound member signs in, the dashboard shows only the Locations they cover. The server works out a coverage value once per request, next to the member's Powers: "all", or the list of covered open Location ids with Countries already expanded. Members with no bindings skip the extra work. The same value goes out in the Tenant response the dashboard already loads. Pickers and lists hide uncovered Locations. A deep link to one shows "Your Role does not cover this Location". The server stays the authority; this ticket only hides.

**Blocked by:** 03: Bind a team member to Countries or Locations

**Status:** done

- [ ] A member bound to Airport sees only Airport in the Location picker and lists; an unbound member sees all.
- [ ] A Country binding shows every open Location in that Country, including one opened afterwards, with no re-assigning.
- [ ] Opening an uncovered Location by its link shows the "does not cover" message, not an empty or broken page.
- [ ] A member with no bindings causes no extra query.
