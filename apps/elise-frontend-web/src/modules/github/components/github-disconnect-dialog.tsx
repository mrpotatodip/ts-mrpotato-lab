import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { useGithubActions } from "../hooks";
import type { GithubInstallation } from "../schemas";

type GithubDisconnectDialogProps = { install: GithubInstallation };

// -----
// EliseLAB stops using the install, and past scans and reports stay. It
// cannot take access away on GitHub, so the dialog says where that is
// done. Connecting the same install again undoes this.
// -----
export function GithubDisconnectDialog({ install }: GithubDisconnectDialogProps) {
  const [open, setOpen] = useState(false);
  const { disconnect } = useGithubActions();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" aria-label={`Disconnect ${install.accountLogin}`} className="text-status-danger hover:text-status-danger" />}>Disconnect</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Disconnect {install.accountLogin}?</DialogTitle>
          <DialogDescription>
            EliseLAB stops reading repositories through this connection, and no new scan uses it. Past scans and reports stay. This does not remove EliseLAB from GitHub: remove it in your GitHub settings too.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep it</DialogClose>
          <Button variant="destructive" disabled={disconnect.isPending} onClick={() => disconnect.mutate(install.id, { onSuccess: () => setOpen(false) })}>
            {disconnect.isPending ? "Working" : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
