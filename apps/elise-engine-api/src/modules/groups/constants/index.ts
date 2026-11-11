export const GROUP_NOT_FOUND = "Group not found";
export const GROUP_NAME_TAKEN = "A group with this name already exists";
export const GROUP_LIMIT_REACHED = "This account has reached its limit of groups";
export const GROUP_FULL = "This group has reached its limit of members";
export const GROUP_PERSON_NOT_FOUND = "That person has no role in this account";

// -----
// The unique index on (account, lower(name)), to tell a taken name from any other clash
// -----
export const GROUP_NAME_CONSTRAINT = "uq_tenant_groups_tenant_name";
