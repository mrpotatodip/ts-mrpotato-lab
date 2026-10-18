# 08: Enforce on Location-scoped FAQs and the business profile

**What to build:** FAQ writes that are scoped to one Location or one Country, and business profile updates that name a Location (phone and address), respect bindings. The cafe-wide profile fields (description, website, email) and cafe-wide FAQs stay open to any holder of the Power. A FAQ scoped to a Country is allowed when the member covers every open Location in it or is bound to that Country.

**Blocked by:** 05: Enforce a binding on business hours (the tracer for the guard)

**Status:** ready-for-agent

- [ ] A bound member can add, edit and delete a FAQ for a covered Location and gets 403 for an uncovered one.
- [ ] A cafe-wide FAQ and the cafe-wide profile fields stay editable.
- [ ] A phone or address change at an uncovered Location returns 403.
- [ ] Unbound members and Tenant admins are unaffected.
