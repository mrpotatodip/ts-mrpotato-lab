---
type: grilling
status: closed
blocked-by: []
claimed-by: claude
---
# Which Roles can be bound to Countries or Locations?

## Question

tenant_admin stays cafe-wide so the owner always reaches everything. Should binding be a flag on the master role (true for store_admin and store_staff, false for tenant_admin, available to superuser-defined roles), or a property of the person?

## Resolution

- A boolean flag on the master role (working name `can_be_bound`, default off). On for store_admin and store_staff, off for tenant_admin. A new superuser-defined Role starts off; the superuser turns it on from the Role page. No per-member decision.
- Turning it on is always allowed. Turning it off is refused with 409 while any member of that Role still has bindings; the message says how many. The superuser clears the bindings first.
- Fixed off on both system roles (tenant_admin, superuser), enforced on the server and in the database, not only hidden in the UI. Editable on non-system roles, subject to the rule above.
- Only a `tenant` scope Role can carry the flag; a database check rules out a platform Role with it.
- Each change to the flag is written to the append-only audit log with the actor and the before and after value.
