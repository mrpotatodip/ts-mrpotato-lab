# Team

Tenant-scoped Party role management. Confirmed in product grilling 2026-10-16.

A Team page on the current Tenant lists team members and pending Team invites. `can_manage_team` (true only on `tenant_admin` by default) may invite, change Role, revoke, and remove. Other Roles on the Tenant may read. Join is a copyable link bound to one email. No mail. Remove drops the Party role only. The last `tenant_admin` cannot be removed or demoted.
