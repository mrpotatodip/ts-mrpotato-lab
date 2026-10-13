import { useState } from "react";
import type { InviteCode } from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useInviteCodeActions } from "../hooks";
import { canRevokeInviteCode } from "../utils";

// -----
// Revoke with a confirm step. A revoked code
// shows no button.
// -----
export function AdminInviteCodeRevokeButton({ inviteCode }: { inviteCode: InviteCode }) {
  const [open, setOpen] = useState(false);
  const { revoke } = useInviteCodeActions();

  if (!canRevokeInviteCode(inviteCode.status)) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Revoke
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this code?</DialogTitle>
            <DialogDescription>
              {inviteCode.note ? `"${inviteCode.note}" ` : "This code "}
              will stop working right away. Accounts already created with it stay.
            </DialogDescription>
          </DialogHeader>
          {revoke.error ? <p className="text-destructive text-sm">{revoke.error.message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate(inviteCode.id, { onSuccess: () => setOpen(false) })}
            >
              {revoke.isPending ? "Revoking..." : "Revoke code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
