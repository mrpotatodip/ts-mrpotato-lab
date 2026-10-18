# 10: Invite someone with a binding

**What to build:** the invite form uses the same "Radio choice" picker as the member-edit form, with no default, and a bindable Role requires a choice before Invite is enabled. The choice is stored with the pending invite, and accepting the invite creates the member's bindings. A Role that cannot be bound hides the picker.

**Blocked by:** 03: Bind a team member to Countries or Locations

**Status:** ready-for-agent

- [ ] Invite stays disabled until a Whole cafe, Country or Locations choice is made, for a bindable Role.
- [ ] Accepting the invite gives the new member exactly the invited bindings, in the invite's Tenant.
- [ ] A revoked or expired invite leaves no bindings behind.
- [ ] Inviting to a Role that cannot be bound works as before.
