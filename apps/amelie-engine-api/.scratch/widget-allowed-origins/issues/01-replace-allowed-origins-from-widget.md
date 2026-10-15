# 01: Replace Allowed origins from Widget

**Parent:** https://github.com/mrpotatodip/ts-elise-lab/issues/19

**What to build:** A team member whose Role has `can_edit` opens Widget and saves which websites may embed the Customer chat. They paste site URLs. Amelie stores unique `http`/`https` Allowed origins, at most 20, in the order they saved. Empty is allowed: the widget cannot iframe, Amelie chat on `/chat/$slug` still works, and Widget warns. Staff see the list and the install snippet and cannot save. Sign-up `website` still seeds the first Allowed origin once. The Business profile website stays a contact fact. The install snippet and the bubble script stay as they are.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Widget shows the Tenant's Allowed origins under the install snippet
- [ ] A team member with `can_edit` adds and removes rows, then Save replaces the whole list
- [ ] Pasted URLs become origins (`https://sorellacafe.com/menu` → `https://sorellacafe.com`); dupes drop; order is the saved order
- [ ] Only `http` and `https` origins are stored; `*` and other schemes are rejected
- [ ] More than 20 unique origins, or any rejected row, fails the whole write; the previous list is unchanged
- [ ] An empty list is allowed; Widget warns that the cafe site cannot iframe the chat
- [ ] After save, only listed cafe sites can iframe; `/chat/$slug` still works; Amelie is not a row in the list
- [ ] Staff see the list and the snippet and have no add, remove, or Save
- [ ] Sign-up `website` still becomes the first Allowed origin when given; editing Allowed origins does not change the Business profile website
- [ ] `widget-embed.md` records that the dashboard editor exists
