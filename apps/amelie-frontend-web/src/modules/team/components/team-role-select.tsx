import type { TeamRole } from "@repo/contracts/amelie";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";

type TeamRoleSelectProps = {
  id?: string;
  roles: TeamRole[];
  value: string;
  valueLabel: string;
  disabled?: boolean;
  onChange: (role: string) => void;
  "aria-label": string;
};

// -----
// The options are the Roles the signed-in Person
// can assign. A held Role outside that list still
// shows, but cannot be picked.
// -----
export function TeamRoleSelect({
  id,
  roles,
  value,
  valueLabel,
  disabled,
  onChange,
  "aria-label": ariaLabel,
}: TeamRoleSelectProps) {
  const assignable = roles.some((role) => role.key === value);

  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const picked = roles.find((role) => role.key === next);
        if (picked && picked.key !== value) onChange(picked.key);
      }}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-fit min-w-40">
        <SelectValue>{valueLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {assignable ? null : (
          <SelectItem value={value} disabled>
            {valueLabel}
          </SelectItem>
        )}
        {roles.map((role) => (
          <SelectItem key={role.key} value={role.key}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
