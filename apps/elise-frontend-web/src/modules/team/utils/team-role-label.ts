// -----
// The database calls the top role "Tenant admin". Everywhere else the app says
// "Account", so the reader sees "Account admin". The key stays the same; only
// what is shown changes. Any other role keeps the engine's label.
// -----
const SHOWN_AS = new Map([["tenant_admin", "Account admin"]]);

export const teamRoleLabel = (key: string, label: string) => SHOWN_AS.get(key) ?? label;
