# 03: Bind a team member to Countries or Locations

**What to build:** a tenant_admin can limit a member to Countries and Locations from the team page. A member holds a list of bindings; each names one Country (every Location in it, including ones opened later) or one Location. Countries and Locations can be mixed, and a Country plus a Location inside it is allowed and folded away on save. The member-edit form is the "Radio choice" design chosen in the prototype: two cards, "Whole cafe" and "Only some", with a Country-and-Locations checklist and no default; Save stays disabled until a choice is made. Saving a member to a Role that cannot be bound clears their bindings. Each member row shows a text badge ("Whole cafe", or the names). Each change goes to the audit log with the before and after set and the actor. Nothing is enforced yet: this ticket only stores and shows bindings. Remove the prototype's variant switch and code when the real form lands. Source: tickets 02, 03, 04 and 09 in `tickets/`.

**Blocked by:** 02: Let a superuser mark a Role as bindable

**Status:** done

- [x] A bound-capable member can be saved with a Country, with Locations, or with a mix; the database keeps every binding inside the member's own Tenant and allows exactly one of Country or Location per row.
- [x] A member with no bindings stays cafe-wide; no existing member changes.
- [x] A Role that cannot be bound hides the picker, says Locations are cleared on save, and clears them.
- [x] Choosing "Whole cafe" after being bound is recorded in the audit log with the actor and the before and after set.
- [x] The prototype code and `?variant=` hook are gone.
