# 01: Resolve the dashboard Country and Location pick

**What to build:** Given open Countries, open Locations, a stored pair, and the active Tenant, you get the Country and Location this tab should be on. Country filters Location. Stale ids fall back. One Country in the cafe still omits `countryId`. One Location in the cafe still omits `locationId`. Several Locations in the cafe still name a Location even when the current Country has only one. Covered by tests. No chrome yet.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `resolveDashboardScope` picks Country first from the stored id, else the oldest open Country
- [ ] Location options are the open places in that Country; a stored Location in another Country is ignored
- [ ] Archived or missing stored ids fall back to oldest open Country, then oldest open Location in that Country
- [ ] API `countryId` is omitted when the cafe has one open Country
- [ ] API `locationId` is omitted when the cafe has one open Location
- [ ] API `locationId` is still the one place in this Country when the cafe has several open Locations
- [ ] A Country with no open Locations reports an empty place (no Location id, do not use another Country's Location)
