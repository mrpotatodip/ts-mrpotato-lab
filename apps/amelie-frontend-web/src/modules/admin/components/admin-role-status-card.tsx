import { useState } from "react";
import type { AdminRoleDetail } from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useAdminRoleActions } from "../hooks";
import { adminRoleCanToggle, adminRoleDisableBlocker, formatAdminHolderCount, formatAdminPowerCount } from "../utils";
import { AdminRoleStatusBadge } from "./admin-role-status-badge";

type AdminRoleStatusCardProps = {
  role: AdminRoleDetail;
};

// -----
// Enabling gives every cafe this role to assign. Disabling
// only stops new assignments: people who hold it keep it.
// -----
export function AdminRoleStatusCard({ role }: AdminRoleStatusCardProps) {
  const { setEnabled } = useAdminRoleActions();
  const [confirming, setConfirming] = useState(false);
  const blocker = adminRoleDisableBlocker(role);
  const canToggle = adminRoleCanToggle(role);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminRoleStatusBadge role={role} />
        <p className="text-muted-foreground text-sm">
          {formatAdminPowerCount(role.powerCount)} · {formatAdminHolderCount(role.holderCount)}
        </p>
      </div>
      <p className="text-muted-foreground text-sm">
        {role.enabled
          ? "Every cafe can give this role to its team."
          : "No cafe sees this role yet. Set its powers, then enable it."}
      </p>
      {role.enabled && blocker ? <p className="text-muted-foreground text-xs">{blocker}</p> : null}
      {setEnabled.error ? <p className="text-destructive text-xs">{setEnabled.error.message}</p> : null}
      {canToggle ? (
        <div>
          {role.enabled ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
              Disable
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={setEnabled.isPending}
              onClick={() => setEnabled.mutate({ roleId: role.id, enabled: true })}
            >
              {setEnabled.isPending ? "Enabling..." : "Enable for every cafe"}
            </Button>
          )}
        </div>
      ) : null}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable {role.label}?</DialogTitle>
            <DialogDescription>
              Cafes can no longer invite anyone to it or move anyone onto it. People who already hold it keep their
              powers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={setEnabled.isPending}
              onClick={() =>
                setEnabled.mutate({ roleId: role.id, enabled: false }, { onSuccess: () => setConfirming(false) })
              }
            >
              {setEnabled.isPending ? "Disabling..." : "Disable role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
