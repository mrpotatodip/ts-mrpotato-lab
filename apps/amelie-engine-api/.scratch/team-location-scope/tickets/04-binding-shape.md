---
type: grilling
status: closed
blocked-by: []
claimed-by: claude
---
# How is a binding shaped and stored?

## Question

A member is cafe-wide, bound to Countries, or bound to Locations. Can Countries and Locations be mixed (FAQs allow only one of the two)? Does a Country binding cover Locations opened later? One table of grants (party_role_scopes) naming a Country or a Location, versus columns on party_roles. Composite FKs to keep tenants apart.

## Resolution

- A member holds a **list of bindings**; each binding names exactly one Country or one Location. Countries and Locations may be mixed (a member can cover all of Canada and only the Airport in the US).
- A Location is covered when any binding names it or names its Country.
- A Country binding points at the Country itself, so Locations opened later are covered automatically; Locations are looked up when the check runs, never copied.
- Stored in one table (working name `party_role_scopes`): a plain id, the Party role, a nullable Country and a nullable Location, a check that exactly one of the two is set, a unique constraint per member and Country or Location, and composite foreign keys to the Party role and to the Country or Location so every row stays inside its Tenant.
- A Country binding and a Location binding inside that Country may coexist; the overlap is not an error. The form folds the redundant row away on save.
- No history table. The existing append-only audit log gets an entry with the before and after set whenever a member's bindings change.
- A member with no bindings is a separate question (ticket: default for unbound members).
