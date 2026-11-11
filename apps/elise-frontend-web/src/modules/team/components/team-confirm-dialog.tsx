import { useState, type ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";

type TeamConfirmDialogProps = {
  triggerLabel: string;
  triggerAriaLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => Promise<void>;
  children?: ReactNode;
};

export function TeamConfirmDialog({ triggerLabel, triggerAriaLabel, title, description, confirmLabel, pending, onConfirm, children }: TeamConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" aria-label={triggerAriaLabel} className="text-status-danger hover:text-status-danger" />}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children && <DialogBody>{children}</DialogBody>}
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
            {pending ? "Working" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
