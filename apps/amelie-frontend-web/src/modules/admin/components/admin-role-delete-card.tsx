import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { adminRoleDeleteBlocker } from "../utils";

type AdminRoleDeleteCardProps = {
  role: AdminRoleDetail;
};

// -----
// Only a role nobody holds can go. The server also
// refuses one an invite still points at.
// -----
export function AdminRoleDeleteCard({ role }: AdminRoleDeleteCardProps) {
  const { remove } = useAdminRoleActions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const blocker = adminRoleDeleteBlocker(role);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {blocker ?? "Removes the role and its powers. The history of its changes stays."}
      </p>
      <div>
        <Button type="button" variant="outline" size="sm" disabled={blocker !== null} onClick={() => setOpen(true)}>
          Delete role
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {role.label}?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          {remove.error ? <p className="text-destructive text-xs">{remove.error.message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(role.id, { onSuccess: () => void navigate({ to: "/admin/roles" }) })
              }
            >
              {remove.isPending ? "Deleting..." : "Delete role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
