export type AdminPowerScope = "tenant" | "platform";

export type AdminPowerOption = { power: string; action: string };

export type AdminPowerSection = { path: string; label: string; options: AdminPowerOption[] };

export type AdminPowerGroup = { key: string; label: string; sections: AdminPowerSection[] };

export type AdminPowerEdits = Readonly<Record<string, boolean>>;

export type AdminAuditDescription = { title: string; details: string[] };

export type AdminRolePowerSave = {
  isPending: boolean;
  errorMessage: string | null;
  save: (powers: string[], onSaved: () => void) => void;
};

export type AdminPowerArea = { name: string; rows: { section: AdminPowerSection; label: string }[] };
