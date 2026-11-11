import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import type { Runner } from "../schemas";

type RunnerRemoveDialogProps = {
  runner: Runner;
  pending: boolean;
  onConfirm: () => Promise<void>;
};

// -----
// Says what removing does for this state: a connected computer stops
// working, a waiting code stops working.
// -----
const consequence = (runner: Runner): string => {
  if (runner.state === "connected") return `${runner.name} stops running scans for this account at once, and its Runner app says it was removed. To use it again, add it again with a new code.`;
  if (runner.state === "waiting") return "The code you made stops working. You can add the computer again with a new code.";
  return "This clears the expired entry from the list. You can add the computer again with a new code.";
};

export function RunnerRemoveDialog({ runner, pending, onConfirm }: RunnerRemoveDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" aria-label={`Remove ${runner.name}`} className="text-status-danger hover:text-status-danger" />}>Remove</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove this runner?</DialogTitle>
          <DialogDescription>{consequence(runner)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep it</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              onConfirm()
                .then(() => setOpen(false))
                .catch(() => undefined);
            }}
          >
            {pending ? "Removing" : "Remove runner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
