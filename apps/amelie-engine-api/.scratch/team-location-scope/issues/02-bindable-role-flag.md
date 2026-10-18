# 02: Let a superuser mark a Role as bindable

**What to build:** a superuser decides, per Role, whether its members can be limited to Countries or Locations. The setting is on the Role page. It is on for Store admin and Store staff, off for Tenant admin, and off by default for a new Role. Turning it on is always allowed. Turning it off is refused while any member of that Role still has bindings, and the message says how many. It is fixed off for system roles and for platform-scope Roles, enforced on the server and in the database, not only hidden. Every change goes to the append-only audit log with the actor and the before and after value.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The Role page shows the setting and saves it for a non-system Tenant Role.
- [ ] Turning it off with bindings present returns 409 and the page shows "Cannot turn this off: N members still have bindings. Clear them first."
- [ ] Tenant admin and Superuser cannot have it on, through the API or directly in the database.
- [ ] An audit entry exists for each change, with the actor and before and after.
- [ ] Existing Roles migrate to the stated defaults and no member's access changes.
