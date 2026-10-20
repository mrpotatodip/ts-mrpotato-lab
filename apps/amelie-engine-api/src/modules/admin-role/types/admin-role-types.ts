export type RoleSummary = { key: string; label: string; description: string | null; enabled: boolean };

export type AuditPayload = RoleSummary | (RoleSummary & { powers: string[] }) | { enabled: boolean } | { canBeBound: boolean } | { powers: string[] } | null;
