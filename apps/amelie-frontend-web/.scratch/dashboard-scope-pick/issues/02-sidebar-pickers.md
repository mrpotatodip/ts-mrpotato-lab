# 02: Country and Location pickers under the cafe picker

**What to build:** With two or more open Countries, a compact Country select sits under the cafe name. With two or more open Locations in that Country, a compact Location select sits under it. Staff can change them. The pair is remembered in this tab for that Tenant. Switching cafe resets it. Refresh may snap from the default to the stored pick. Menu, Hours, and Profile still have their own switchers.

**Blocked by:** 01 Resolve the dashboard Country and Location pick

**Status:** ready-for-agent

- [ ] Pickers sit in the sidebar header under the cafe picker, matching its compact unlabeled `w-48` select
- [ ] Country picker shows only with two or more open Countries
- [ ] Location picker shows only with two or more open Locations in the current Country
- [ ] Changing Country or Location writes `sessionStorage` keyed by Tenant
- [ ] Switching cafe reads a different key (the previous cafe's pick does not apply)
- [ ] Closed sidebar does not copy the pickers into the top bar
