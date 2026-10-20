import type { AdminRoleDetail } from "@repo/contracts/amelie";
import { Checkbox } from "#/components/ui/checkbox";
import { adminRoleBindingLocked } from "../utils";

type AdminRoleBindingCardProps = {
  role: AdminRoleDetail;
  saving: {
    isPending: boolean;
    errorMessage: string | null;
    save: (canBeBound: boolean) => void;
  };
};

const LABEL = "Members can be limited to a Country or Location";

export function AdminRoleBindingCard({ role, saving }: AdminRoleBindingCardProps) {
  const locked = adminRoleBindingLocked(role);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={role.canBeBound}
          disabled={locked !== null || saving.isPending}
          onCheckedChange={(checked) => saving.save(checked === true)}
        />
        {LABEL}
      </label>
      <p className="text-muted-foreground text-sm">
        {role.canBeBound
          ? "A cafe owner can bind someone with this role to chosen Countries or Locations."
          : "Everyone with this role works across the whole cafe."}
      </p>
      {locked ? <p className="text-muted-foreground text-xs">{locked}</p> : null}
      {saving.errorMessage ? <p className="text-destructive text-xs">{saving.errorMessage}</p> : null}
    </div>
  );
}
