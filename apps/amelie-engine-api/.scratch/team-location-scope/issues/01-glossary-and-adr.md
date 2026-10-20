# 01: Write the glossary terms and the ADR for scoped team members

**What to build:** the shared vocabulary and the recorded reasoning, so every later ticket uses one language. Add the new terms to the Amelie glossary: binding, covered Location, bound Power, whole-cafe member. Write one ADR for the hard-to-reverse choices: an explicit marker on bound Powers with its own guard (not inferred from the name), no bindings meaning cafe-wide, and never widening a member whose Locations are all archived. Source: the closed tickets in this map (`tickets/`).

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] The glossary defines the four terms with no implementation detail, and uses "Location", never "store".
- [ ] The glossary entries for Party role and Location point to the new terms where they say the team belongs to the Tenant.
- [ ] The ADR names the alternatives rejected (name-prefix rule, per-service checks, cafe-wide-by-absence versus no-access-by-absence) and why.
