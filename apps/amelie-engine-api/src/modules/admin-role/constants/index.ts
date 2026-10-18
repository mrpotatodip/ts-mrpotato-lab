// -----
// Admin roles
// -----
export const ADMIN_ROLE_NOT_FOUND = "Role not found";
export const ADMIN_ROLE_KEY_TAKEN = "A role with that key already exists";
export const ADMIN_ROLE_KEY_CONSTRAINT = "uq_access_master_roles_key";
export const ADMIN_ROLE_SYSTEM_LOCKED = "A system role cannot be deleted or disabled";
export const ADMIN_ROLE_SYSTEM_POWERS = "A system role cannot lose powers";
export const ADMIN_ROLE_PLATFORM_LOCKED = "A platform role cannot be enabled or disabled";
export const ADMIN_ROLE_IN_USE = "This role is held or invited somewhere. Disable it instead";
export const ADMIN_POWER_UNKNOWN = "Not a power this role can hold";
export const ADMIN_ROLE_CANNOT_BIND = "A system or platform role cannot have members limited to a Country or Location";
export const adminRoleStillBound = (count: number) =>
  `Cannot turn this off: ${count} ${count === 1 ? "member still has" : "members still have"} bindings. Clear them first.`;
